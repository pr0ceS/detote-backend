const { Product } = require("../models/Product");
const { auth, isUser, isAdmin } = require("../middlewares/auth");
const cloudinary = require("../utils/cloudinary");
const slugify = require('slugify');
const Joi = require("joi");

const router = require("express").Router();

// Get all Products
router.get("/", async (req, res) => {
  try {
		const products = await Product.find()

    res.json(products);
  } catch (error) {
		// Delete in Production
		console.log(error);
    res.status(500).json({message: error});
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
  const { name, desc, smallDesc, dropdowns, price, oldPrice, image, stock, deliveryTime, soldOut } = req.body;

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
            smallDesc,
            dropdowns,
            url: await slugify(name).toLowerCase(),
            price,
            oldPrice,
            image: newArray,
            stock,
            deliveryTime,
            soldOut,
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
  
    await product.save();
    res.json({review: updatedProductReview, success: true});
  }
})

module.exports = router;
