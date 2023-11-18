const jwt = require("jsonwebtoken");

const generateAuthToken = (user) => {
  const jwtSecretKey = process.env.JWT_SECRET_KEY;
  const maxAge = 3 * 60 * 60;
  const token = jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    },
    jwtSecretKey,
    {
      expiresIn: maxAge, // 3hr in seconds
    }
  );

  return token;
};

module.exports = generateAuthToken;
