const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
	res.cookie("x-auth-token", "", { maxAge: "1" })
	// res.redirect("/")
  res.json("Logout OK")
});

module.exports = router;
