const { Product } = require("../models/Product");
const { isAdmin } = require("../middlewares/auth");
const cloudinary = require("../utils/cloudinary");
const slugify = require('slugify');
const Joi = require("joi");

const router = require("express").Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get products without reviews
router.get('/withoutreviews', async (req, res) => {
  try {
    // Use projection to fetch only necessary fields
    const products = await Product.find({}, { reviews: 0 });

    // Send the response directly without converting to plain objects
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.get('/gifts', async (req, res) => {
  try {
    const products = await Product.find();

    // Filter products where the 'free' key is true
    const giftProducts = products.filter(product => product.free === true);

    // Convert Mongoose documents to plain JavaScript objects
    const plainGiftProducts = giftProducts.map(product => product.toObject());

    // Remove 'reviews' property from each product
    const productsWithoutReviews = plainGiftProducts.map(({ reviews, ...rest }) => rest);

    res.json(productsWithoutReviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get single Product
router.get("/find/:url", async (req, res) => {
  try {
    const product = await Product.findOne({url: req.params.url});

    res.json(product);
  } catch (error) {
    res.status(500).json({message: error});
  }
});

// Create new Product ADMIN
router.post("/", isAdmin, async (req, res) => {
  const { name, desc, metaDesc, smallDesc, dropdowns, price, oldPrice, image, stock, deliveryTime, soldOut, models, free } = req.body;

  try {
    if (image) {
			let newArray = [];
      
      async function uploadImages() {
        for (let img of image) {
          // let response = await cloudinary.uploader.upload(img, {upload_preset: "ml_default"})
          newArray.push(img);
        }
        if(newArray) {
          const product = new Product({
            name,
            desc,
            metaDesc,
            smallDesc,
            dropdowns,
            url: await slugify(name).toLowerCase(),
            price,
            oldPrice,
            image: newArray,
            stock,
            deliveryTime,
            soldOut,
            models,
            free
          });
          
          const savedProduct = await product.save();
          res.json(savedProduct);
        }
      }

      uploadImages();
    }
  } catch (error) {
		// Delete in Production
    console.log(error);
    res.status(500).json({message: error});
  }
});

// Delete single Product
router.delete("/:id", isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) return res.json({ message: "Product not found" });
		else {
			const deletedProduct = await Product.findByIdAndDelete(req.params.id);

			res.json(deletedProduct);
		}
  } catch (error) {
    res.status(500).json({message: error});
  }
});

// Edit single Product
// Heavily needs fix
router.put("/:id", isAdmin, async (req, res) => {
  if (req.body.productImg) {
    const destroyResponse = await cloudinary.uploader.destroy(
      req.body.product.image.public_id
    );

    if (destroyResponse) {
      const uploadedResponse = await cloudinary.uploader.upload(
        req.body.productImg,
        {
          upload_preset: "ml_default",
        }
      );

      if (uploadedResponse) {
        const updatedProduct = await Product.findByIdAndUpdate(
          req.params.id,
          {
            $set: {
              ...req.body.product,
              image: uploadedResponse,
            },
          },
          { new: true }
        );

        res.json(updatedProduct);
      }
    }
  } else {
    try {
      const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        {
          $set: req.body.product,
        },
        { new: true }
      );
      res.json(updatedProduct);
    } catch (err) {
      res.status(500).send(err);
    }
  }
});

router.post('/review', async (req, res) => {
  // Create new Guest visitor
	const { name, email, stars, message, title, url } = req.body;
	const schema = Joi.object({
    name: Joi.string().max(100).required(),
    email: Joi.string().email().max(200).required(),
    stars: Joi.number().min(1).max(5).required(),
    message: Joi.string().required(),
    title: Joi.string().required(),
    url: Joi.string().max(300).required(),
  });

	// Validate if there is anything missing or errors
	const { error } = schema.validate(req.body);

	if (error) return res.json({message: error.details[0].message, success: false });

  let product = await Product.findOne({ url: url })

  if(product) {
    let currentDate = Date.now();
    const updatedProductReview = {
      name: name,
      email: email,
      stars: stars,
      title: title,
      message: message,
      date: currentDate,
    }

    product.reviews.push(updatedProductReview)

    const reviewCount = product.reviews.length;
    const reviewSum = product.reviews.reduce((sum, review) => sum + review.stars, 0);
    const reviewAverage = reviewSum / reviewCount;

    // Update Product document
    product.reviewAverage = reviewAverage;
    product.reviewCount = reviewCount;
  
    await product.save();
    res.json({review: updatedProductReview, success: true});
  }
})

router.post('/generatereview', async (req, res) => {
  const { name, email, stars, message, image, title, url } = req.body;
  const schema = Joi.object({
    name: Joi.string().max(100).required(),
    email: Joi.string().email().max(200).required(),
    stars: Joi.number().min(1).max(5).required(),
    message: Joi.string().required(),
    title: Joi.string().required(),
    image: Joi.string().optional.allow(" "),
    url: Joi.string().max(300).required(),
  });

  const { error } = schema.validate(req.body);

  if (error) return res.json({ message: error.details[0].message, success: false });

  let product = await Product.findOne({ url: url });

  if (product) {
    let currentDate = product.reviews.length > 0 ? product.reviews[product.reviews.length - 1].date : new Date('2023-12-28').getTime();

    // Decrement the date for each review post
    const reviewsLength = product.reviews.length + 1;
    const oneDayInMilliseconds = 24 * 60 * 60 * 1000; // One day in milliseconds

    // Calculate the new date
    currentDate -= oneDayInMilliseconds;

    const updatedProductReview = {
      name: name,
      email: email,
      stars: stars,
      title: title,
      image: image,
      message: message,
      date: currentDate,
    };

    product.reviews.push(updatedProductReview);

    const reviewSum = product.reviews.reduce((sum, review) => sum + review.stars, 0);
    const reviewAverage = reviewSum / reviewsLength;
    const reviewCount = reviewsLength;

    // Update Product document
    product.reviewAverage = reviewAverage;
    product.reviewCount = reviewCount;

    await product.save();
    res.json({ review: updatedProductReview, success: true });
  }
});

module.exports = router;
