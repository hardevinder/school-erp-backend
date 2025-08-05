const express = require("express");
const router = express.Router();
const feeStatusController = require("../controllers/FeeStatusController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// 🔒 Protect all fee status routes – Only Admin & Super Admin can access
router.get(
  "/fee-heading-wise-students",
  authenticateUser,
  authorizeRole(["admin", "superadmin"]),
  feeStatusController.getFeeHeadingWiseStudentDetails
);

module.exports = router;
