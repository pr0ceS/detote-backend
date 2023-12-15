require("dotenv").config();
const express = require("express");
const Stripe = require("stripe");
const { sendOutMails } = require("../middlewares/mailersend");
const { Order } = require("../models/Order");
const { Product } = require("../models/Product");
const crypto = require('crypto');
const Mega = require('megajs')

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const moment = require('moment');
const { Readable } = require("stream");

const stripe = Stripe(process.env.STRIPE_KEY);
const discountTen = process.env.DISCOUNT_TEN_TEST;
const paidUrl = process.env.PAID_URL;
const cancelUrl = process.env.CANCEL_URL;

const router = express.Router();


router.post("/create-checkout-session", async (req, res) => {
  const randomReference = await crypto.randomBytes(4).toString('hex');
  if (req.body.cartItems) {
    // Iterate through each product in the products array
    req.body.cartItems.forEach((product) => {
      const freeStatus = product.product && product.product.free;
      const image = product.product && product.product.image;
      const name = product.product && product.product.name;
      const price = product.product && product.product.price;
      const quantity = product.quantity;
      const model = product.model;
  
      // Clear all properties of the product except productInfo.free
      Object.keys(product.product).forEach((key) => {
        if (key !== '_id' && key !== 'free') {
          delete product.product[key];
        }
      });
  
      // Set productInfo.free back to its original value
      product.product.free = freeStatus;
      product.product.image = image;
      product.product.name = name;
      product.product.price = price;
  
      // Update quantity and model
      product.quantity = quantity;
      product.model = model;
    });
  }

  const customer = await stripe.customers.create({
    metadata: {
      userId: req.body.userId ? req.body.userId : "GUEST",
			fingerprint: req.body.fingerprint,
      visitRef: req.body.visitRef,
      ordernumber: randomReference.toUpperCase()
    },
  });

  const line_items = await Promise.all(req.body.cartItems.map(async ({ product, quantity, model }) => {
    // Perform MongoDB search to get productInfo
    const productInfo = await Product.findOne({ _id: product._id });
  
    // Get the base unit amount (in cents)
    let unitAmount = productInfo.price * 100;
  
    // Adjust unit amount based on currency
    switch (req.body.currency) {
      case 'eur':
        // No adjustment for EUR
        break;
      case 'usd':
        // No adjustment for USD
        break;
      case 'aud':
        unitAmount *= 1.68;
        break;
      case 'cad':
        unitAmount *= 1.475;
        break;
      case 'gbp':
        unitAmount *= 0.875;
        break;
      default:
        break;
    }
  
    return {
      price_data: {
        currency: req.body.currency,
        product_data: {
          name: `${product.name}${model ? `,${model}` : ""}`,
          images: [product.image[0]],
          metadata: {
            id: product._id,
          },
        },
        unit_amount: Math.round(unitAmount), // Round to avoid floating-point issues
      },
      quantity: quantity,
    };
  }));
  
	// Discount calculator
	let totalProducts = 0;
	let discount = 0;

	for (const item of req.body.cartItems) {
    if (item.hasOwnProperty('quantity') && (!item.product || !item.product.free)) {
      totalProducts += item.quantity;
    }
  }  

	if (totalProducts >= 3) {
		discount = 10; // Apply 10% discount if they buy 3 or more products
	}

  // "sofort", "bancontact", "klarna", "customer_balance", "sepa_debit", "giropay", "eps",
  const session = await stripe.checkout.sessions.create({
    shipping_address_collection: {
      allowed_countries: ["US", "GB", "AU", "CA", "SE", "NO", "NZ", "AT", "CH", "LU", "NL", "DE", "BE"],
    },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: {
            amount: req.body.insurance ? 299 : 0,
            currency: req.body.currency,
          },
          display_name: req.body.insurance ? "Shipping Protection" : "Free Shipping"
        }}],
    line_items,
		discounts: discount !== 0 ? [
			{
				coupon: discount === 10 ? discountTen : ""
			}
		] : [],
    mode: "payment",
    customer: customer.id,
    locale: "auto",
    success_url: `${process.env.CLIENT_URL}${paidUrl}`,
    cancel_url: `${process.env.CLIENT_URL}${cancelUrl}`,
  });

  res.json({ url: session.url });
});

const createInvoiceAndOrder = async (customer, data, lineItems) => {
	try {
    const newOrder = await new Order({
      userId: await customer?.metadata?.userId ? await customer?.metadata?.userId : "GUEST",
      fingerprint: await customer?.metadata?.fingerprint,
      visitRef: await customer?.metadata?.visitRef,
      products: await lineItems,
      total: await data?.amount_total,
      customerInfo: await data?.customer_details,
      payment_status: await data?.payment_status,
      insurance: await data?.shipping_cost?.amount_total === 299 ? true : false,
      reference: await customer?.metadata?.ordernumber,
      customerId: await data?.customer,
    });
    await newOrder.save();

    const orderAmount = await Order.countDocuments();
    try {
      const uploadToMega = async (doc) => {
        const storage = new Mega.Storage({
          email: 'mkbtradingnl@gmail.com', // Replace with your MEGA email
          password: 'Mksuperboy12', // Replace with your MEGA password
        });
      
        const fileName = `invoice_${`F0000${orderAmount}`}_${customer?.metadata?.ordernumber}_${moment(Date.now()).locale("nl").format('L')}.pdf`;
      
        // Create a Readable stream for the PDF content
        const pdfBuffer = await new Promise((resolve) => {
          const chunks = [];
          doc.on('data', (chunk) => chunks.push(chunk));
          doc.on('end', () => resolve(Buffer.concat(chunks)));
        });
      
        const fileReadStream = Readable.from(pdfBuffer);
      
        // Upload the PDF directly to MEGA
        storage.once('ready', async () => {
          try {
            await storage.upload({
              name: fileName,
              size: pdfBuffer.length,
            }, fileReadStream).complete;
      
            console.log('Successfully uploaded to MEGA.');
          } catch (error) {
            console.error('Error uploading to MEGA:', error);
          }
        });
      
        storage.once('error', (error) => {
          console.error('MEGA storage error:', error);
        });
      };

    const doc = new PDFDocument({ margin: 40, size: "A4",});

    doc.fontSize(20)
      .font("Helvetica")
      .text("Invoice", 40, 98, {fontWeight: 800})
      .fillColor('#000000')
      .font("Helvetica")
      .fontSize(10)
      .text('MKB-Trading', 200, 30, { align: 'right'})
      .text('Jaargetijdenweg 29-3,', 200, 42, { align: 'right' })
      .text('7532 SX Enschede', 200, 54, { align: 'right' })
      .text('KVK: 88897818', 200, 75, { align: 'right' })
      .text('BTW: NL 004667125B52', 200, 87, { align: 'right' })
      .moveDown();

    doc
      .strokeColor("#aaaaaa")
      .lineWidth(1)
      .moveTo(40, 140)
      .lineTo(557, 140)
      .stroke()
      .moveDown();

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Invoice to:", 40, 155)
      .fontSize(12)
      .font("Helvetica")
      .text(data?.customer_details?.name, 40, 170)
      .text(data?.customer_details?.address?.line1, 40, 185)
      .text(`${data?.customer_details?.address?.postal_code} ${data.customer_details.address.city}`, 40, 200)
      .moveDown();
      
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Invoice number:", 330, 158)
      .text("Date:", 330, 177)
      .text("Reference:", 330, 197)

      .font("Helvetica")
      .text(`F0000${orderAmount ? (orderAmount) : 1}`, 230, 158, {align: "right"})
      .text(moment(Date.now()).locale("nl").format('L'), 230, 177, {align: "right"})
      .text(customer?.metadata?.ordernumber.toUpperCase(), 230, 197, {align: "right"})
      .moveDown();

    doc
      .strokeColor("#aaaaaa")
      .lineWidth(1)
      .moveTo(40, 225)
      .lineTo(557, 225)
      .stroke()
      .moveDown();

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Description", 40, 300, {fontWeight: 800})
      .text("Amount", 270, 300, {fontWeight: 800})
      .text("Unit price (€ )", 340, 300, {fontWeight: 800})
      .text("Total amount (€ )", 453, 300, {fontWeight: 800})
      .moveDown();

    doc
      .strokeColor("#999999")
      .lineWidth(1)
      .moveTo(40, 318)
      .lineTo(557, 318)
      .stroke()
      .moveDown();
    
    let margin1 = 30;
    let totals = 0;
    let totalInSumme = 0;
    let tax = 0;

    doc.fontSize(10)
    doc.font("Helvetica")
      lineItems?.data?.push({
        amount_total: data?.shipping_cost?.amount_total === 299 ? 299 : 0,
        quantity: 1,
        description: data?.shipping_cost?.amount_total === 299 ? "Shipping protection" : "Free shipping",
      })
      lineItems?.data?.map((product, index) => {
        doc.text(product?.description, 40, (298 + (index + 1) * margin1))
        doc.text(product?.quantity, 0, (298 + (index + 1) * margin1), {align: "right", width: 307})
        doc.text((product?.amount_total / product?.quantity / 100).toLocaleString('en-us', { maximumFractionDigits: 2, minimumFractionDigits: 2}), 0, (298 + (index + 1) * margin1), {align: "right", width: 422})
        doc.text((product?.amount_total / 100).toLocaleString('en-us', { maximumFractionDigits: 2, minimumFractionDigits: 2}), 0, (298 + (index + 1) * margin1), {align: "right"})
        doc
        .strokeColor("#aaaaaa")
        .lineWidth(1)
        .moveTo(40, (317 + (index + 1) * margin1))
        .lineTo(557, (317 + (index + 1) * margin1))
        .stroke()
        doc.moveDown()
        totals = margin1 * (index + 1)
        totalInSumme = totalInSumme + product?.amount_total
      })
    totals = totals
    doc.font("Helvetica")
    doc.text("Subtotal", 0, (totals + 30 + 298), {align: "right", width: 422})
    doc.text("Total amount Excl. VAT", 0, (totals + 47 + 298), {align: "right", width: 422})
    doc.font("Helvetica-Bold")
    doc.text("VAT % ", 0, (totals + 64 + 298), {align: "right", width: 422})
    doc.text("Total amount Excl. VAT", 0, (totals + 81 + 298), {align: "right", width: 422})
    doc.moveDown()

    doc.font("Helvetica")
    doc.text("€ " + (totalInSumme / 100).toLocaleString('en-us', { maximumFractionDigits: 2, minimumFractionDigits: 2}), 0, (totals + 30 + 298), {align: "right"})
    doc.text("€ " + (totalInSumme / 100).toLocaleString('en-us', { maximumFractionDigits: 2, minimumFractionDigits: 2}), 0, (totals + 47 + 298), {align: "right"})
    doc.font("Helvetica-Bold")
    doc.text(`${tax}%`, 0, (totals + 64 + 298), {align: "right"})
    doc.text("€ " + ((totalInSumme * (tax / 100) + totalInSumme) / 100).toLocaleString('en-us', { maximumFractionDigits: 2, minimumFractionDigits: 2}), 0, (totals + 81 + 298), {align: "right"})

    doc.fontSize(10)
      .text(
        "Exemption from Dutch VAT in accordance with Article 25 of the Dutch VAT Act",
        0,
        780,
        {align: "center", width: 600}
      )

    doc.end();
    uploadToMega(doc);
    } catch (error) {
      console.log(error);	
    }
  } catch(err) {
    console.log(err);
  }
}

// Stripe webhoook
router.post(
  "/webhook",
  express.json({ type: "application/json" }),
  async (req, res) => {
    let data;
    let eventType;


    // Check if webhook signing is configured.
    let webhookSecret;
    // webhookSecret = process.env.STRIPE_WEB_HOOK;

    if (webhookSecret) {
      // Retrieve the event by verifying the signature using the raw body and secret.
      let event;
      let signature = req.headers["stripe-signature"];

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          webhookSecret
        );
      } catch (err) {
        console.log(`⚠️  Webhook signature verification failed:  ${err}`);
        return res.sendStatus(400);
      }
      // Extract the object from the event.
      data = event.data.object;
			// console.log(event.data.object);
      eventType = event.type;
    } else {
      // Webhook signing is recommended, but if the secret is not configured in `config.js`,
      // retrieve the event data directly from the request body.
      data = req.body.data.object;
      eventType = req.body.type;
    }

    // Handle the checkout.session.completed event
    if (eventType === "checkout.session.completed") {
      stripe.customers
        .retrieve(data.customer)
        .then(async (customer) => {
          try {
            // CREATE ORDER
            stripe.checkout.sessions.listLineItems(
              data.id,
              {},
              async function (err, lineItems) {
									await createInvoiceAndOrder(customer, data, lineItems)
									// .then(() => sendPaymentReceive(customer?.email, customer?.))
                  .then(() => sendOutMails(customer?.email, data.shipping_details.name, customer.metadata.ordernumber))
									.catch((e) => console.log(e));

              }
            );
          } catch (err) {
            console.log(typeof createInvoiceAndOrder);
            console.log(err);
          }
        })
        .catch((err) => console.log(err.message));
    }

    res.status(200).end();
  }
);

module.exports = router;
