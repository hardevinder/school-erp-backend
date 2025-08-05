const express = require("express");
const razorpay = require("../razorpayInstance");

const router = express.Router();

// Route to Create a Payment Order
router.post("/create-order", async (req, res) => {
  try {
    const { amount, studentId } = req.body;

    const options = {
      amount: amount * 100, // Convert to paise (₹1 = 100 paise)
      currency: "INR",
      receipt: `receipt_${studentId}_${Date.now()}`,
      payment_capture: 1, // Auto-capture payment
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;