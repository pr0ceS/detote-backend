const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    name: { type: String, required: true },
    message: { type: String, required: true }
  },
  { timestamps: true }
);

const Contact = mongoose.model("Contact", contactSchema);

exports.Contact = Contact;
