const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    desc: { type: String },
    metaDesc: { type: String },
		smallDesc: { type: Array },
		dropdowns: { type: Array },
		url: {type: String, required: true },
    price: { type: Number, required: true },
    oldPrice: { type: Number },
    image: { type: Array, required: true },
		stock: {type: Number },
		deliveryTime: {type: Number},
		soldOut: {type: Boolean, default: false},
		reviews: [
			{
				name: { type: String, required: true},
				email: { type: String, required: true},
				stars: { type: Number, required: true, min: 0, max: 5},
				title: { type: String, required: true},
				message: { type: String, required: true},
				date: { type: Date },
			}
		],
		reviewCount: {type: Number},
		reviewAverage: {type: Number},
		models: {type: Array},
		free: {type: Boolean, default: false}
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

exports.Product = Product;
