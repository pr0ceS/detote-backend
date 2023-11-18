const bcrypt = require("bcrypt");
const { User } = require("../models/user");
const Joi = require("joi");
const express = require("express");
const generateAuthToken = require("../utils/generateAuthToken");
const router = express.Router();

router.post("/", async (req, res) => {
  const schema = Joi.object({
    email: Joi.string().max(200).required().email(),
    password: Joi.string().max(200).required(),
  });

  const { error } = schema.validate(req.body.user);

  if (error) return res.json({message: error.details[0].message, success: false });

  let user = await User.findOne({ email: req.body.user.email });
  if (!user) return res.json({message: "E-mail and/or password are incorrect", success: false});

  const validPassword = await bcrypt.compare(req.body.user.password, user.password);
  if (!validPassword)
    return res.json({message: "E-mail and/or password are incorrect", success: false});

  const token = generateAuthToken(user);

  res.json({ cookie: token, success: true })
});

module.exports = router;
