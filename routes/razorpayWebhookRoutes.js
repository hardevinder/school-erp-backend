const express = require("express");
const studentFeeController = require("../controllers/studentFeeController");

const router = express.Router();

// ✅ Razorpay Webhook Route
router.post("/webhook", studentFeeController.handleWebhook);

module.exports = router;