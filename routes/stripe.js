require("dotenv").config();
const express = require("express");
const Stripe = require("stripe");
const { sendPaymentReceive } = require("../middlewares/mailersend");
const { Order } = require("../models/Order");

const stripe = Stripe(process.env.STRIPE_KEY);
const discountFive = process.env.DISCOUNT_FIVE;
const discountTen = process.env.DISCOUNT_TEN;
const stripeLocale = process.env.LOCALE;
const paidUrl = process.env.PAID_URL;
const cancelUrl = process.env.CANCEL_URL;

const router = express.Router();

router.post("/create-checkout-session", async (req, res) => {
  const customer = await stripe.customers.create({
    metadata: {
      userId: req.body.userId ? req.body.userId : "GUEST",
			fingerprint: req.body.fingerprint,
    },
  });
	
  const line_items = req.body.cartItems.map((item) => {
    return {
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          images: [item.image.url],
          metadata: {
            id: item.id,
          },
        },
        unit_amount: item.price * 100,
      },
      quantity: item.cartQuantity,
    };
  });

	// Discount calculator
	let totalProducts = 0;
	let discount = 0;

	for (const item of req.body.cartItems) {
		if (item.hasOwnProperty('cartQuantity')) {
			totalProducts += item.cartQuantity;
		}
	}

	if (totalProducts === 2) {
		discount = 5; // Apply 5% discount if they buy 2 products
	} else if (totalProducts >= 3) {
		discount = 10; // Apply 10% discount if they buy 3 or more products
	}

  // "sofort", "bancontact", "klarna", "customer_balance", "sepa_debit", "giropay", "eps",
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["bancontact", "ideal", "paypal", "klarna", "card"],
    shipping_address_collection: {
      allowed_countries: ["NL","DE", "BE"],
    },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: {
            amount: req.body.insurance ? 299 : 0,
            currency: "usd",
          },
          display_name: req.body.insurance ? "Shipping Protection" : "Free Shipping",
          delivery_estimate: {
            minimum: {
              unit: "business_day",
              value: 4,
            },
            maximum: {
              unit: "business_day",
              value: 7,
            },
          },
        }}],
    line_items,
		discounts: discount !== 0 ? [
			{
				coupon: discount === 5 ? discountFive : discount === 10 ? discountTen : ""
			}
		] : [],
    mode: "payment",
    customer: customer.id,
    locale: stripeLocale,
    success_url: `${process.env.CLIENT_URL}${paidUrl}`,
    cancel_url: `${process.env.CLIENT_URL}${cancelUrl}`,
  });

  res.json({ url: session.url });
});

// Create order function
const createOrder = async (customer, data, lineItems) => {
  const newOrder = new Order({
		userId: await customer?.metadata?.userId ? await customer?.metadata?.userId : "GUEST",
		fingerprint: await customer?.metadata?.fingerprint,
    products: await lineItems?.data,
    total: await data?.amount_total,
    customerInfo: await data?.customer_details,
    payment_status: await data?.payment_status,
		insurance: await data?.shipping_cost?.amount_total === 299 ? true : false,
    customerId: await data?.customer,
  });
  try {
    await newOrder.save();
  } catch (err) {
    console.log(err);
  }
};

// Stripe webhoook
router.post(
  "/webhook",
  express.json({ type: "application/json" }),
  async (req, res) => {
    let data;
    let eventType;


    // Check if webhook signing is configured.
    let webhookSecret;
    //webhookSecret = process.env.STRIPE_WEB_HOOK;

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
              function (err, lineItems) {
									createInvoiceAndOrder(customer, data, lineItems)
									.then((savedInvoice) => sendPaymentReceive(customer?.email, "We have received your order!", savedInvoice))
									.catch((e) => console.log(e));

              }
            );
          } catch (err) {
            console.log(typeof createOrder);
            console.log(err);
          }
        })
        .catch((err) => console.log(err.message));
    }

    res.status(200).end();
  }
);

module.exports = router;
