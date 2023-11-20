const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
	res.cookie("x-auth-token", "", { maxAge: "1" })
	console.log(req.header);
	// res.redirect("/")
  res.json("Logout OK")
});

module.exports = router;
