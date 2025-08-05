const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/employeeLeaveRequestController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// Reviewer roles
const allowReviewers = authorizeRole([
  "admin",
  "hr",
  "academic_coordinator",
  "superadmin",
]);

// ──── Public to any logged-in user ──────────────────────

// 1. Submit a new leave request
router.post("/", authenticateUser, ctrl.createLeaveRequest);

// 2. List your own leave requests
router.get("/", authenticateUser, ctrl.getOwnLeaveRequests);

// 3. Edit your own pending request
router.put("/:id", authenticateUser, ctrl.updateLeaveRequest);

// ──── Reviewer-only endpoints ──────────────────────────

// 4. List all leave requests (filters optional)
router.get("/all", authenticateUser, allowReviewers, ctrl.getAllLeaveRequests);

// 5. Approve or reject a leave request
router.patch("/:id/status", authenticateUser, allowReviewers, ctrl.updateLeaveRequestStatus);

module.exports = router;
