const express = require('express');
const { isAdmin } = require('../middlewares/auth');
const { Mail } = require('../models/Mail');

const router = express.Router();

router.post("/", async (req, res) => {
	const {email} = req.body;

	if (!email) {
		res.json({message: "Please enter an E-mail"})
	} else if (email.length > 100) {
		res.json({message: "Character length exceeded"})
	} else {
		try {
			const newMail = new Mail({
				email: email
			})

			await newMail.save();
			res.json({message: "Successfully subscribed"})
		} catch (error) {
			console.log(error);
			res.json({message: error});
		}
	}
})

router.get('/', isAdmin, async (req, res) => {
	const mails = await Mail.find({})

	res.json(mails);	
})

module.exports = router;