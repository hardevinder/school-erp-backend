const express = require("express");
const router = express.Router();

const attendanceController = require("../controllers/employeeAttendanceController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

const allowHRorSuperadmin = authorizeRole(["hr", "superadmin"]);

/* =========================================================
   Attendance & Reports (single controller)
   Base mount (in app.js/server.js):
   app.use("/employee-attendance", router);
========================================================= */

/* ------------- Marking ------------- */
// 🔐 Mark Attendance (bulk or single) — HR/Superadmin only
router.post(
  "/mark",
  authenticateUser,
  allowHRorSuperadmin,
  attendanceController.markAttendance
);

/* ------------- HR: date view ------------- */
// 🔍 HR: Get attendance records for a specific date (?date=YYYY-MM-DD)
router.get(
  "/",
  authenticateUser,
  allowHRorSuperadmin,
  attendanceController.getAttendanceByDate
);

/* ------------- Employee self-service ------------- */
// 👤 Employee: My calendar (month view) — GET /employee-attendance/my-calendar?month=YYYY-MM
router.get(
  "/my-calendar",
  authenticateUser,
  attendanceController.getMyAttendanceCalendar
);

// 👤 Employee: My current month report — GET /employee-attendance/my-current-month
router.get(
  "/my-current-month",
  authenticateUser,
  attendanceController.getMyCurrentMonthReport
);

/* ------------- HR: month rollups ------------- */
// 🧑‍🤝‍🧑 HR: Current month report for all — GET /employee-attendance/current-month
router.get(
  "/current-month",
  authenticateUser,
  allowHRorSuperadmin,
  attendanceController.getCurrentMonthReportForAll
);

// 📊 HR: Monthly summary (aggregates for ALL employees)
// Primary:   GET /employee-attendance/summary/month?month=YYYY-MM
// Alias:     GET /employee-attendance/monthly-summary?month=YYYY-MM
router.get(
  "/summary/month",
  authenticateUser,
  allowHRorSuperadmin,
  attendanceController.getMonthlySummary
);
router.get(
  "/monthly-summary",
  authenticateUser,
  allowHRorSuperadmin,
  attendanceController.getMonthlySummary
);

/* ------------- HR: single-employee month summary + calendar ------------- */
// 📋 HR: Employee month summary + calendar
// Primary:   GET /employee-attendance/employee-summary/:employee_id?month=YYYY-MM
// Alias:     GET /employee-attendance/summary/:employee_id?month=YYYY-MM   (for existing frontend calls)
router.get(
  "/employee-summary/:employee_id",
  authenticateUser,
  allowHRorSuperadmin,
  attendanceController.getEmployeeAttendanceSummary
);
router.get(
  "/summary/:employee_id",
  authenticateUser,
  allowHRorSuperadmin,
  attendanceController.getEmployeeAttendanceSummary
);

/* ------------- HR: full history for one employee ------------- */
// 📄 HR: Full attendance history for a specific employee
// GET /employee-attendance/employee/:employee_id
router.get(
  "/employee/:employee_id",
  authenticateUser,
  allowHRorSuperadmin,
  attendanceController.getAttendanceByEmployee
);

module.exports = router;
