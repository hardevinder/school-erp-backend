const express = require("express");
const router = express.Router();
const feeHeadingController = require("../controllers/feeHeadingController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware"); // Import middleware

// Protect all fee heading routes – Only Admin & Super Admin can access
router.post("/", authenticateUser, authorizeRole(["admin", "superadmin"]), feeHeadingController.createFeeHeading);
router.get("/", authenticateUser, authorizeRole(["admin", "superadmin"]), feeHeadingController.getFeeHeadings);
router.put("/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), feeHeadingController.updateFeeHeading);
router.delete("/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), feeHeadingController.deleteFeeHeading);

module.exports = router;
