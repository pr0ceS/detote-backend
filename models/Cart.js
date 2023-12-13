const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema(
  {
		fingerprint: { type: String, required: true },
		products: [
			{
				productId: { type: String },
				quantity: { type: Number },
				model: {type: String},
			}
		],
		total: { type: Number, default: 0 },
		totalQuantity: { type: Number },
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", CartSchema);

exports.Cart = Cart;
