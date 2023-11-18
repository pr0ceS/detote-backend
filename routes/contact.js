const express = require('express');
const { Contact }= require('../models/Contact');
const { Mail } = require('../models/Mail');
const { isAdmin } = require("../middlewares/auth");

const router = express.Router();

router.post('/', async (req, res) => {
	const {email, name, message} = req.body;

	if(!email || !name || !message) {
		res.json({message: "Please fill in all fields"});
	}

	else if(email.length > 100 || name.length > 100 || message.length > 1000) {
		res.json({message: "Character length exceeded"});
	}

	else {
		try {
			const newMail = Mail({ email: email })
			
			const newContact = new Contact({
				email: email,
				name: name,
				message: message
			})
			
			await newMail.save()
			await newContact.save();
			res.json({message: "Sent successfully"})
		} catch (error) {
			res.json({message: error});
		}
	}
})

router.get("/", isAdmin, async (req, res) => {
	const Contacts = await Contact.find({});
	res.json(Contacts);
})

module.exports = router;