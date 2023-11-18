const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String },
    customerInfo: { type: Object, required: true },
		fingerprint: { type: String },
    products: { type: Array },
    total: { type: Number, required: true },
    delivery_status: { type: String, default: "pending" },
    fulfilled: { type: Boolean, default: false },
    payment_status: { type: String },
		insurance: {type: Boolean},
    // Extra Info
    customerId: { type: String },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

exports.Order = Order;
