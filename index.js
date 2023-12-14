const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require("cors");
const mongoose = require("mongoose");
const helmet = require('helmet');
const morgan = require('morgan');

// Routes
const productsRoute = require("./routes/products");
const registerRoute = require('./routes/register');
const loginRoute = require('./routes/login');
const logoutRoute = require('./routes/logout');
const usersRoute = require('./routes/users');
const stripeRoute = require('./routes/stripe');
const ordersRoute = require('./routes/orders');
const mailRoute = require('./routes/mail');
const guestRoute = require('./routes/guest');
const adminRoute = require('./routes/admin');
const contactRoute = require('./routes/contact');

const app = express();

require("dotenv").config();

app.set('trust proxy', true);
app.use(cookieParser());
app.use(cors({ credentials: true }));
app.use(express.json({ limit: '50000mb'}));
app.use(helmet());
app.use(morgan('tiny'));

app.use("/api/products", productsRoute);
app.use("/api/register", registerRoute);
app.use("/api/login", loginRoute);
app.use("/api/logout", logoutRoute);
app.use("/api/users", usersRoute);
app.use("/api/admin", adminRoute);
app.use("/api/stripe", stripeRoute);
app.use("/api/orders", ordersRoute);
app.use("/api/mail", mailRoute);
app.use("/api/guest", guestRoute);
app.use("/api/contact", contactRoute);


const uri = process.env.DB_URI;
const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server running on port: ${port}...`);
});

mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connection established..."))
  .catch((error) => console.error("MongoDB connection failed:", error.message));
