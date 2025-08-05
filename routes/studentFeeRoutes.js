const express = require("express");
const studentFeeController = require("../controllers/studentFeeController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

const router = express.Router();

// Protect create-order and verify-payment routes so that only students can access them.
router.post(
  "/create-order",
  authenticateUser,
  authorizeRole(["student"]),
  studentFeeController.createOrder
);
router.post(
  "/verify-payment",
  authenticateUser,
  authorizeRole(["student"]),
  studentFeeController.verifyPayment
);

// Webhook endpoint is left unprotected because it is called by Razorpay.
router.post("/webhook", studentFeeController.handleWebhook);

module.exports = router;
