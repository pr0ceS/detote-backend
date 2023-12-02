const express = require('express');
const Joi = require('joi');
const { Guest } = require('../models/Guest');

const router = express.Router();

// Create new Guest
router.post('/', async (req, res) => {
	// Create new Guest visitor
	const { fingerprint, ip, visitRef, origin, country, utm_source, utm_medium, referrer, device} = req.body;
	const schema = Joi.object({
    fingerprint: Joi.string().max(200).required(),
    ip: Joi.string().max(200).required(),
    visitRef: Joi.string().max(200).required(),
    origin: Joi.string().max(200).optional().allow(''),
    country: Joi.string().max(200).optional().allow(''),
    utm_source: Joi.string().max(200).optional().allow(''),
    utm_medium: Joi.string().max(200).optional().allow(''),
		referrer: Joi.string().max(200).optional().allow(''),
		device: Joi.string().max(200).optional().allow(''),
  });

	// Validate if there is anything missing or errors
	const { error } = schema.validate(req.body);

	if (error) return res.status(400).send(error.details[0].message);

	let guest = await Guest.findOne({ fingerprint: fingerprint });
	// If fingerprint exists in DB
	if (guest) {
		let existingVisit = guest.visit.find((visit) => visit.visitRef === visitRef);
		let currentDate = Date.now();
		if (existingVisit) {
			res.json("visitRef already exists")
		} else {
			const newVisitRef = {
				visitRef: visitRef,
				addToCart: false,
				reachedCheckout: false,
				converted: false,
				origin: origin,
				country: country,
				utmSource: utm_source,
				utmMedium: utm_medium,
				referrer: referrer,
				device: device,
				date: currentDate,
			};

			guest.visit.push(newVisitRef)

			await guest.save();
			res.json({guest});
		}
	} 
	// If fingerprint does not exist
	else if (!guest) {
		let currentDate = Date.now();
		guest = new Guest({
			fingerprint: fingerprint,
			ip: ip,
			visit: [
				{
					visitRef: visitRef,
					addToCart: false,
					reachedCheckout: false,
					converted: false,
					origin: origin,
					country: country,
					utmSource: utm_source,
					utmMedium: utm_medium,
					referrer: referrer,
					device: device,
					date: currentDate,
				}
			],
		});

		await guest.save();
		res.json({guest});
	}
})

// Change addToCart parameter to true
router.put('/cart', async (req, res) => {
	const { fingerprint, visitRef, origin, country, utm_source, utm_medium, referrer, device } = req.body;
	const schema = Joi.object({
    fingerprint: Joi.string().required(),
    visitRef: Joi.string().max(200).required(),
    origin: Joi.string().max(200).optional().allow(''),
    country: Joi.string().max(200).optional().allow(''),
    utm_source: Joi.string().max(200).optional().allow(''),
    utm_medium: Joi.string().max(200).optional().allow(''),
    referrer: Joi.string().max(200).optional().allow(''),
		device: Joi.string().max(200).optional().allow(''),
  });
	// Validate if there is anything missing or errors
	const { error } = schema.validate(req.body);

	if (error) {
		console.log(error);
		return res.json({message: error.details[0].message, success: false});
	}

	let guest = await Guest.findOne({ fingerprint: fingerprint });

	if (guest) {
		let existingVisit = guest.visit.find((visit) => visit.visitRef === visitRef);
		let currentDate = Date.now();
		if (existingVisit) {
			existingVisit.addToCart = true;

			await guest.save();
			res.json({guest});
		} else {
			const newVisitRef = {
				visitRef: visitRef,
				addToCart: true,
				reachedCheckout: false,
				converted: false,
				origin: origin,
				country: country,
				utmSource: utm_source,
				utmMedium: utm_medium,
				referrer: referrer,
				device: device,
				date: currentDate
			};

			guest.visit.push(newVisitRef)

			await guest.save();
			res.json({guest});
		}
	} else {
		res.json("Guest does not exist, create new Guest")
	}
})

// Change stripeCheckout parameter t o true
router.put('/checkout', async (req, res) => {
	const { fingerprint, visitRef, origin, country, utm_source, utm_medium, referrer, device } = req.body;
	const schema = Joi.object({
    fingerprint: Joi.string().required(),
    visitRef: Joi.string().max(200).required(),
    origin: Joi.string().max(200).optional().allow(''),
    country: Joi.string().max(200).optional().allow(''),
    utm_source: Joi.string().max(200).optional().allow(''),
    utm_medium: Joi.string().max(200).optional().allow(''),
    referrer: Joi.string().max(200).optional().allow(''),
		device: Joi.string().max(200).optional().allow(''),
  });
	// Validate if there is anything missing or errors
	const { error } = schema.validate(req.body);

	if (error) {
		console.log(error);
		return res.json({message: error.details[0].message, success: false});
	}

	let guest = await Guest.findOne({ fingerprint: fingerprint });

	if (guest) {
		let existingVisit = guest.visit.find((visit) => visit.visitRef === visitRef);
		let currentDate = Date.now();
		if (existingVisit) {
			existingVisit.reachedCheckout = true;

			await guest.save();
			res.json({guest});
		} else {
			const newVisitRef = {
				visitRef: visitRef,
				addToCart: true,
				reachedCheckout: false,
				converted: false,
				origin: origin,
				country: country,
				utmSource: utm_source,
				utmMedium: utm_medium,
				referrer: referrer,
				device: device,
				date: currentDate
			};

			guest.visit.push(newVisitRef)

			await guest.save();
			res.json({guest});
		}
	} else {
		res.json("Guest does not exist, create new Guest")
	}
})

// Change converted parameter to true
router.put('/converted', async (req, res) => {
	const { fingerprint, visitRef, origin, country, utm_source, utm_medium, referrer, device } = req.body;
	const schema = Joi.object({
    fingerprint: Joi.string().required(),
    visitRef: Joi.string().max(200).required(),
    origin: Joi.string().max(200).optional().allow(''),
    country: Joi.string().max(200).optional().allow(''),
    utm_source: Joi.string().max(200).optional().allow(''),
    utm_medium: Joi.string().max(200).optional().allow(''),
    referrer: Joi.string().max(200).optional().allow(''),
		device: Joi.string().max(200).optional().allow(''),
  });
	// Validate if there is anything missing or errors
	const { error } = schema.validate(req.body);

	if (error) {
		console.log(error);
		return res.json({message: error.details[0].message, success: false});
	}

	let guest = await Guest.findOne({ fingerprint: fingerprint });

	if (guest) {
		let existingVisit = guest.visit.find((visit) => visit.visitRef === visitRef);
		let currentDate = Date.now();
		if (existingVisit) {
			existingVisit.converted = true;

			await guest.save();
			res.json({guest});
		} else {
			const newVisitRef = {
				visitRef: visitRef,
				addToCart: true,
				reachedCheckout: false,
				converted: false,
				origin: origin,
				country: country,
				utmSource: utm_source,
				utmMedium: utm_medium,
				referrer: referrer,
				device: device,
				date: currentDate
			};

			guest.visit.push(newVisitRef)

			await guest.save();
			res.json({guest});
		}
	} else {
		res.json("Guest does not exist, create new Guest")
	}
})

module.exports = router;