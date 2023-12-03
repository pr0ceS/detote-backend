const bcrypt = require("bcrypt");
const { User } = require("../models/user");
const Joi = require("joi");
const express = require("express");
const generateAuthToken = require("../utils/generateAuthToken");
const { Mail } = require("../models/Mail");
const router = express.Router();

router.post("/", async (req, res) => {
  const { name, email, password } = req.body.user;
  const schema = Joi.object({
    name: Joi.string().min(0).max(200).required(),
    email: Joi.string().min(0).max(200).required().email(),
    password: Joi.string().min(6).max(200).required(),
  });

  const { error } = schema.validate(req.body.user);

  if (error) return res.json({message: error.details[0].message, success: false });

  let user = await User.findOne({ email: req.body.user.email });
  if (user) return res.json({message: "E-Mail is already in use",  success: false });


  user = new User({
    name: name,
    email: email,
    password: password,
  });

  const newMail = Mail({ email: email })
  await newMail.save()

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);

  await user.save();

  const token = generateAuthToken(user);

  res.json({user: user._id, cookie: token, success: true })
});

module.exports = router;
