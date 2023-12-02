const mongoose = require("mongoose");


const guestSchema = new mongoose.Schema(
  {
		fingerprint: { type: String },
		ip: { type: String },
		visit: [
			{
				visitRef: { type: String },
				addToCart: { type: Boolean, default: false },
				reachedCheckout: { type: Boolean, default: false },
				converted: { type: Boolean, default: false },
				origin: { type: String },
				country: { type: String },
				utmSource: { type: String },
				utmMedium: { type: String },
				referrer: { type: String },
				device: {type: String},
				date: {type: Date},
			}
		],
	},
	{ timestamps: true }
);

const Guest = mongoose.model("Guest", guestSchema);

exports.Guest = Guest;
