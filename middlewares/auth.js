const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  const token = req.header("x-auth-token");
  if (!token)
    return res.send("Access denied. Not verified.");
  try {
    const jwtSecretKey = process.env.JWT_SECRET_KEY;
    const decoded = jwt.verify(token, jwtSecretKey);

    req.user = decoded;
    next();
  } catch (ex) {
    res.json({Error: ex.message});
  }
};

// For User Profile
const isUser = (req, res, next) => {
  auth(req, res, () => {
    if (req.user._id === req.params.id || req.user.isAdmin) {
      next();
    } else {
      res.json("Access denied. Not verified.");
    }
  });
};

// For Admin
const isAdmin = (req, res, next) => {
  auth(req, res, () => {
    if (req.user.isAdmin) {
      next();
    } else {
      res.json("Access denied. Not verified.");
    }
  });
};

module.exports = { auth, isUser, isAdmin };
