const { Order } = require("../models/Order");
const { isUser, isAdmin } = require("../middlewares/auth");
const { sendOrderShipped, sendOrderDelivered } = require("../middlewares/mailersend");
const moment = require("moment");

const router = require("express").Router();

// Update order information
router.put("/:id", isAdmin, async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        $set: req.body,
      },
      { new: true }
    );

		if(req.body.delivery_status === "dispatched") {
      // Send tracking code along with it
			sendOrderShipped(req.body.shipping?.email, "Your order is on its way!", req.body)
		} else if (req.body.delivery_status === "delivered") {
			sendOrderDelivered(req.body.shipping?.email, "Your order has been delivered!", req.body)
		}

    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.put('/registered/:id', isUser, async (req, res) => {
  try {
    // Find the corresponding Order by ID and update the userId
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        $set: { userId: req.body.userId }, // Update the userId field
      },
      { new: true }
    );

    // Additional logic for sending emails based on delivery status
    if (req.body.delivery_status === "dispatched") {
      // Send tracking code along with it
      sendOrderShipped(req.body.shipping?.email, "Your order is on its way!", req.body);
    } else if (req.body.delivery_status === "delivered") {
      sendOrderDelivered(req.body.shipping?.email, "Your order has been delivered!", req.body);
    }

    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json(err);
  }
});


//DELETE
router.delete("/:id", isAdmin, async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json("Order deleted");
  } catch (err) {
    res.status(500).json(err);
  }
});

//GET USER ORDERS
router.get("/find/:id", isUser, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.id });
    res.json(orders);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Get latest order by fingerprint
router.get("/find/order/:fingerprint", async (req, res) => {
  try {
    const orders = await Order.find({ fingerprint: req.params.fingerprint })
      .sort({ createdAt: -1 }) // Sort by createdAt in descending order
      .limit(1); // Limit the results to one order

    res.status(200).send({order: orders, success: false});
  } catch (err) {
    res.json({message: err, success: false});
  }
});

//GET ALL ORDERS
router.get("/", isAdmin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ _id: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json(err);
  }
});

// GET AN ORDER
router.get("/findOne/:id", isAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    res.json(order);
  } catch (error) {
    res.status(500).json(error);
  }
});

// GET ORDER STATS
router.get("/stats", isAdmin, async (req, res) => {
  const previousMonth = moment()
    .month(moment().month() - 2)
    .format();

  try {
    const orders = await Order.aggregate([
      { $match: { createdAt: { $gte: new Date(previousMonth) } } },
      {
        $project: {
          month: { $month: "$createdAt" },
        },
      },
      {
        $group: {
          _id: "$month",
          total: { $sum: 1 },
        },
      },
    ]);
    res.status(200).send(orders);
  } catch (err) {
    res.status(500).send(err);
  }
});

// GET MONTHLY INCOME
router.get("/income", isAdmin, async (req, res) => {
  const previousMonth = moment()
    .month(moment().month() - 2)
    .format();

  try {
    const income = await Order.aggregate([
      { $match: { createdAt: { $gte: new Date(previousMonth) } } },
      {
        $project: {
          month: { $month: "$createdAt" },
          sales: "$total",
        },
      },
      {
        $group: {
          _id: "$month",
          total: { $sum: "$sales" },
        },
      },
    ]);
    res.status(200).send(income);
  } catch (err) {
    res.status(500).send(err);
  }
});

// WEEK'S SALES
router.get("/week-sales", isAdmin, async (req, res) => {
  const last7Days = moment()
    .day(moment().day() - 7)
    .format();

  try {
    const income = await Order.aggregate([
      { $match: { createdAt: { $gte: new Date(last7Days) } } },
      {
        $project: {
          day: { $dayOfWeek: "$createdAt" },
          sales: "$total",
        },
      },
      {
        $group: {
          _id: "$day",
          total: { $sum: "$sales" },
        },
      },
    ]);
    res.status(200).send(income);
  } catch (err) {
    res.status(500).send(err);
  }
});

// Get all sales
router.get("/all-sales", isAdmin, async (req, res) => {
  try {
    const income = await Order.aggregate([
      {
        $project: {
          sales: "$total",
        },
      },
      {
        $group: {
					_id: "$all",
          total: { $sum: "$sales" },
        },
      },
    ]);
    res.status(200).send(income);
  } catch (err) {
    res.status(500).send(err);
  }
});

module.exports = router;
