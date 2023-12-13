const Joi = require("joi");
const { Cart } = require('../models/Cart');
const { Product } = require('../models/Product');

const router = require("express").Router();

// Get cart / create
router.post('/', async (req, res) => {
  const { fingerprint } = req.body;
  const schema = Joi.object({
    fingerprint: Joi.number().required(),
  });

  const { error } = schema.validate(req.body);

  if (error) return res.status(400).send(error.details[0].message);

  let cart = await Cart.findOne({ fingerprint: fingerprint });

  const calculateCartAge = (cart) => {
    const currentDate = new Date();
    const createdAt = cart.createdAt;
    const timeDifference = currentDate - createdAt; // This will give you the time difference in milliseconds
    const ageInDays = timeDifference / (1000 * 3600 * 24); // Convert milliseconds to days
    return ageInDays;
  };

  if (cart) {
    const cartAgeInDays = calculateCartAge(cart);

    if (cartAgeInDays > 30) {
      await Cart.findByIdAndDelete(cart._id);

      const newCart = new Cart({
        fingerprint: fingerprint,
        total: 0,
      });

      await newCart.save()
      res.json(newCart)
    } else {
      let productsInfoArray = [];
      let totalPrice = 0;
      let totalQuantity = 0;

      // Find products in DB and put them in a single array
      for ({ productId, quantity, model } of cart.products) {
        const productInfo = await Product.findOne({ _id: productId });

        // Convert Mongoose document to plain JavaScript object
        const productInfoObject = productInfo.toObject();

        productsInfoArray.push({ productId, quantity, model: model, productInfo: productInfoObject });
      }


      for (const singleProduct of productsInfoArray) {
        const { quantity, productInfo } = singleProduct;

        // Exclude products with productInfo.free: true from the total quantity and total price
        if (!productInfo || !productInfo.free) {
          totalPrice += quantity * productInfo.price;
          totalQuantity += quantity;
        }
      }

      let discountRate = 1; // Default no discount

      if (totalQuantity >= 3) {
        discountRate = 0.85; // 15% discount for total quantity of 3 or more
      }

      const discountedTotalPrice = totalPrice * discountRate;

      // Iterate through productsInfoArray and remove the reviews property
      const productsWithoutReviews = productsInfoArray.map(product => {
        // Destructure the product to get productInfo without reviews
        const { productInfo: { reviews, desc, dropdowns, ...productWithoutReviews }, ...rest } = product;

        // Return the modified product without reviews
        return { productInfo: productWithoutReviews, ...rest };
      });

      // Now you can use productsWithoutReviews in your response
      res.json({ products: productsWithoutReviews, total: discountedTotalPrice });
    }

  } else {
    cart = new Cart({
      fingerprint: fingerprint,
      total: 0,
    });

    await cart.save()
    res.json(cart)
  }
})

// Add to cart / create
router.post('/add', async (req, res) => {
  const { fingerprint, products, modelName } = req.body;
  const schema = Joi.object({
    fingerprint: Joi.number().required(),
    products: Joi.array().optional(),
    modelName: Joi.string().optional().allow(' ')
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.json({message: error.details[0].message, success: false});
  }

  let cart = await Cart.findOne({ fingerprint: fingerprint });

  if (cart) {
    // Add products in the req.body to the cart or increment quantity
    for (const { productId, quantity } of products) {
      // Check if the product with the same productId and matching model exists in the cart
      const existingProduct = cart.products.find(
        (product) => product.productId === productId && (!modelName || product.model === modelName)
      );
    
      if (existingProduct) {
        // If the product already exists with the same model, increment the quantity
        existingProduct.quantity += quantity;
      } else {
        // If the product doesn't exist or has a different model, add it to the cart
        if (modelName) {
          cart.products.push({ productId: productId, quantity: quantity, model: modelName });
        } else {
          cart.products.push({ productId: productId, quantity: quantity });
        }
      }
    }

    let productsInfoArray = [];
    let totalPrice = 0;
    let totalQuantity = 0;

    // Find products in DB and put them in a single array
    for ({ productId, quantity } of cart.products) {
      const productInfo = await Product.findOne({ _id: productId });

      // Convert Mongoose document to plain JavaScript object
      const productInfoObject = productInfo.toObject();

      productsInfoArray.push({ productId, quantity, model: modelName, productInfo: productInfoObject });
    }

    // Calculate total price
    for (const singleProduct of productsInfoArray) {
      const { quantity, productInfo } = singleProduct;

      // Exclude products with productInfo.free: true from the total quantity and total price
      if (!productInfo || !productInfo.free) {
        totalPrice += quantity * productInfo.price;
				totalQuantity += quantity;
      }
    }

    let discountRate = 1; // Default no discount

    if (totalQuantity >= 3) {
      discountRate = 0.85; // 15% discount for a total quantity of 3 or more
    }

    const discountedTotalPrice = totalPrice * discountRate;

    // Save the updated cart
    await cart.save();

    const productsWithoutReviews = productsInfoArray.map(product => {
      // Destructure the product to get productInfo without reviews
      const { productInfo: { reviews, desc, dropdowns, ...productWithoutReviews }, ...rest } = product;

      // Return the modified product without reviews
      return { productInfo: productWithoutReviews, ...rest };
    });

    // Now you can use productsWithoutReviews in your response
    res.json({ products: productsWithoutReviews, total: discountedTotalPrice });
  } else {
    // Don't forget to add a product to the cart and then send back
    cart = new Cart({
      fingerprint: fingerprint,
      total: 0,
    });

    // Add products in the req.body to the cart or increment quantity
    for (const { productId, quantity } of products) {
      // Check if the product with the same productId and matching model exists in the cart
      const existingProduct = cart.products.find(
        (product) => product.productId === productId && (!modelName || product.model === modelName)
      );
    
      if (existingProduct) {
        // If the product already exists with the same model, increment the quantity
        existingProduct.quantity += quantity;
      } else {
        // If the product doesn't exist or has a different model, add it to the cart
        if (modelName) {
          cart.products.push({ productId: productId, quantity: quantity, model: modelName });
        } else {
          cart.products.push({ productId: productId, quantity: quantity });
        }
      }
    }

    let productsInfoArray = [];
    let totalPrice = 0;
    let totalQuantity = 0;

    // Find products in DB and put them in a single array
    for ({ productId, quantity } of cart.products) {
      const productInfo = await Product.findOne({ _id: productId });

      // Convert Mongoose document to plain JavaScript object
      const productInfoObject = productInfo.toObject();

      productsInfoArray.push({ productId, quantity, model: modelName, productInfo: productInfoObject });
    }

    // Calculate total price
    for (const singleProduct of productsInfoArray) {
      const { quantity, productInfo } = singleProduct;

      // Exclude products with productInfo.free: true from the total quantity and total price
      if (!productInfo || !productInfo.free) {
        totalPrice += quantity * productInfo.price;
        totalQuantity += quantity;
      }
    }

    let discountRate = 1; // Default no discount

    if (totalQuantity >= 3) {
      discountRate = 0.85; // 15% discount for a total quantity of 3 or more
    }

    const discountedTotalPrice = totalPrice * discountRate;

    // Save the updated cart
    await cart.save();

    const productsWithoutReviews = productsInfoArray.map(product => {
      // Destructure the product to get productInfo without reviews
      const { productInfo: { reviews, desc, dropdowns, ...productWithoutReviews }, ...rest } = product;

      // Return the modified product without reviews
      return { productInfo: productWithoutReviews, ...rest };
    });
    
    // Now you can use productsWithoutReviews in your response
    res.json({ products: productsWithoutReviews, total: discountedTotalPrice });
  }
})

// Edit cart / create
router.put('/', async (req, res) => {
  const { fingerprint, products, modelName } = req.body;
  const schema = Joi.object({
    fingerprint: Joi.number().required(),
    products: Joi.array().optional(),
    modelName: Joi.string().optional().allow(' ')
  });

  const { error } = schema.validate(req.body);

  if (error) {
    console.log(error);
    return res.json({ message: error.details[0].message, success: false });
  }

  let cart = await Cart.findOne({ fingerprint: fingerprint });

  if (cart) {
    cart.products = products;

    try {
      await cart.save();
    } catch (error) {
      console.log(error);
    }

    let productsInfoArray = [];
    let totalPrice = 0;
    let totalQuantity = 0;

    // Find products in DB and put them in a single array
    for ({ productId, quantity } of cart.products) {
      const productInfo = await Product.findOne({ _id: productId });

      // Convert Mongoose document to plain JavaScript object
      const productInfoObject = productInfo.toObject();

      productsInfoArray.push({ productId, quantity, model: modelName, productInfo: productInfoObject });
    }

    // Calculate total price
    for (const singleProduct of productsInfoArray) {
      const { quantity, productInfo } = singleProduct;

      // Exclude products with productInfo.free: true from the total quantity and total price
      if (!productInfo || !productInfo.free) {
        totalPrice += quantity * productInfo.price;
        totalQuantity += quantity;
      }
    }

    // Remove free products if totalQuantity is less than 2
    if (totalQuantity < 2) {
      productsInfoArray = productsInfoArray.filter(product => !product.productInfo.free);
    }

    let discountRate = 1; // Default no discount

    if (totalQuantity >= 3) {
      discountRate = 0.85; // 15% discount for a total quantity of 3 or more
    }

    const discountedTotalPrice = totalPrice * discountRate;

    const productsWithoutReviews = productsInfoArray.map(product => {
      // Destructure the product to get productInfo without reviews
      const { productInfo: { reviews, desc, dropdowns, ...productWithoutReviews }, ...rest } = product;

      // Return the modified product without reviews
      return { productInfo: productWithoutReviews, ...rest };
    });
    
    // Now you can use productsWithoutReviews in your response
    res.json({ products: productsWithoutReviews, total: discountedTotalPrice });

  } else {
     // Don't forget to add a product to the cart and then send back
		 cart = new Cart({
      fingerprint: fingerprint,
      total: 0,
    });

    // Add products in the req.body to the cart or increment quantity
    for (const { productId, quantity } of products) {
      // Check if the product with the same productId and matching model exists in the cart
      const existingProduct = cart.products.find(
        (product) => product.productId === productId && (!modelName || product.model === modelName)
      );
    
      if (existingProduct) {
        // If the product already exists with the same model, increment the quantity
        existingProduct.quantity += quantity;
      } else {
        // If the product doesn't exist or has a different model, add it to the cart
        if (modelName) {
          cart.products.push({ productId: productId, quantity: quantity, model: modelName });
        } else {
          cart.products.push({ productId: productId, quantity: quantity });
        }
      }
    }

    let productsInfoArray = [];
    let totalPrice = 0;
    let totalQuantity = 0;

    // Find products in DB and put them in a single array
    for ({ productId, quantity } of cart.products) {
      const productInfo = await Product.findOne({ _id: productId });

      // Convert Mongoose document to plain JavaScript object
      const productInfoObject = productInfo.toObject();

      productsInfoArray.push({ productId, quantity, model: modelName, productInfo: productInfoObject });
    }

    // Calculate total price
    for (const singleProduct of productsInfoArray) {
      const { quantity, productInfo } = singleProduct;

      // Exclude products with productInfo.free: true from the total quantity and total price
      if (!productInfo || !productInfo.free) {
        totalPrice += quantity * productInfo.price;
        totalQuantity += quantity;
      }
    }

    let discountRate = 1; // Default no discount

    if (totalQuantity >= 3) {
      discountRate = 0.85; // 15% discount for a total quantity of 3 or more
    }

    const discountedTotalPrice = totalPrice * discountRate;

    // Save the updated cart
    await cart.save();

    const productsWithoutReviews = productsInfoArray.map(product => {
      // Destructure the product to get productInfo without reviews
      const { productInfo: { reviews, desc, dropdowns, ...productWithoutReviews }, ...rest } = product;

      // Return the modified product without reviews
      return { productInfo: productWithoutReviews, ...rest };
    });
    
    // Now you can use productsWithoutReviews in your response
    res.json({ products: productsWithoutReviews, total: discountedTotalPrice });
  }
});



module.exports = router;


