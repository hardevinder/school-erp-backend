const express = require("express");
const router = express.Router();
const {
  createLeaveRequest,
  getPendingLeaveRequests,
  getLeaveRequestById,
  // getLeaveRequestsByStudentId, // <-- Import function
  updateLeaveRequest,
  deleteLeaveRequest,
  getLeaveSummaryByMonth,
  getLeaveRequestsByLoggedInStudent
} = require("../controllers/leaveController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// Create a leave request – accessible to students (logged-in user is used)
router.post(
  "/",
  authenticateUser,
  authorizeRole(["student"]),
  createLeaveRequest
);

// Get leave summary grouped month-wise – open to all authenticated users
router.get(
  "/summary-by-month",
  authenticateUser,
  getLeaveSummaryByMonth
);

// Get all pending leave requests – for teachers and admin roles
router.get(
  "/",
  authenticateUser,
  authorizeRole(["teacher", "admin", "superadmin", "academic_coordinator", "student"]),
  getPendingLeaveRequests
);

// Get a leave request by ID – open to all authenticated users
router.get("/:id", authenticateUser, getLeaveRequestById);

// ✅ **NEW ROUTE: Get leave requests for the logged-in student (by username)**
router.get(
  "/student/me",
  authenticateUser,
  (req, res) => getLeaveRequestsByLoggedInStudent(req, res, req.user.username)
);

// Update a leave request – allow only teacher, admin, superadmin, and academic_coordinator
router.put(
  "/:id",
  authenticateUser,
  authorizeRole(["teacher", "admin", "superadmin", "academic_coordinator","student"]),
  updateLeaveRequest
);

// Delete a leave request – restrict deletion to teacher, admin, superadmin, and academic_coordinator
router.delete(
  "/:id",
  authenticateUser,
  authorizeRole(["teacher", "admin", "superadmin", "academic_coordinator", "student"]),
  deleteLeaveRequest
);

module.exports = router;
