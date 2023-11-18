const express = require('express');
const Joi = require('joi');
const { Guest } = require('../models/Guest');
const { isAdmin } = require('../middlewares/auth');

const router = require("express").Router();

// Get admin information in one single request
router.get('/', isAdmin, async (req, res) => {

	// Get total visits
	const guests = await Guest.find();
	let totalVisits = 0;
	let convertedVisits = 0;
	let facebookVisits = 0;
	let otherVisits = 0;

	guests.forEach((guest) => {
		totalVisits += guest.visit.length;
		guest.visit.forEach((visit) => {
			if (visit.converted) {
				convertedVisits += 1;
			}	

			if (visit.utmSource === 'facebook') {
				facebookVisits += 1;
			} else {
				otherVisits += 1;
			}
		});
	});

	// Calculate conversion rate
	const conversionRate = (convertedVisits / totalVisits) * 100;
	const facebookPercentage = (facebookVisits / totalVisits) * 100;
	const otherPercentage = (otherVisits / totalVisits) * 100;

	console.log('Total number of visits:', totalVisits);
	console.log('Total number of converted visits:', convertedVisits);
	console.log('Conversion Rate:', conversionRate.toFixed(2) + '%');
	res.json({
		visits: totalVisits,
		converted: convertedVisits,
		conversionRate: conversionRate.toFixed(2),
		facebookVisits: facebookVisits,
		otherVisits: otherVisits,
		facebookVisitsPercentage: facebookPercentage.toFixed(2),
		otherVisitsPercentage: otherPercentage.toFixed(2)
	})
})

module.exports = router;