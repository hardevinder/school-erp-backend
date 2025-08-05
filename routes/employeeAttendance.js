const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/employeeAttendanceController");

const {
  authenticateUser,
  authorizeRole,
} = require("../middlewares/authMiddleware");

const allowHRorSuperadmin = authorizeRole(["hr", "superadmin"]);

/* =========================================================
   Attendance Routes
========================================================= */

// 🔐 Mark Attendance (bulk or single)
router.post("/mark", authenticateUser, allowHRorSuperadmin, attendanceController.markAttendance);

// 🔍 Get attendance records for a specific date
router.get("/", authenticateUser, allowHRorSuperadmin, attendanceController.getAttendanceByDate);

// 📋 HR: Get full summary + calendar for a specific employee
router.get(
  "/employee-summary/:employee_id",
  authenticateUser,
  allowHRorSuperadmin,
  attendanceController.getEmployeeAttendanceSummary
);

// 📄 Get full attendance history for a specific employee
router.get("/:employee_id", authenticateUser, allowHRorSuperadmin, attendanceController.getAttendanceByEmployee);

// 📊 Monthly summary for all employees
router.get("/summary/month", authenticateUser, allowHRorSuperadmin, attendanceController.getMonthlySummary);

// 🗓️ NEW: Logged-in employee's attendance calendar
router.get("/my-calendar", authenticateUser, attendanceController.getMyAttendanceCalendar);

module.exports = router;
