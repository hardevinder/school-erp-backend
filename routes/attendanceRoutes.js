const express = require("express");
const router = express.Router();
const {
  createAttendance,
  getAllAttendance,
  getAttendanceById,
  getAttendanceByDate,
  getAttendanceByDateAndClass,
  getClassAndSectionWiseSummaryForToday, // Summary for today
  getClassAndSectionWiseSummaryByDate,    // Summary by selected date
  updateAttendance,
  deleteAttendance,
  getAttendanceForLoggedInStudent
} = require("../controllers/attendanceController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// GET all attendance records – Only superadmin, academic_coordinator, and teacher have access
router.get(
  "/",
  authenticateUser,
  authorizeRole(["superadmin", "academic_coordinator", "teacher"]),
  getAllAttendance
);

// Create an attendance record – Only superadmin, academic_coordinator, and teacher have access
router.post(
  "/",
  authenticateUser,
  authorizeRole(["superadmin", "academic_coordinator", "teacher"]),
  createAttendance
);

// GET attendance records by date – Only superadmin, academic_coordinator, and teacher have access
router.get(
  "/date/:date",
  authenticateUser,
  authorizeRole(["superadmin", "academic_coordinator", "teacher"]),
  getAttendanceByDate
);

// GET attendance records by date and class – Only superadmin, academic_coordinator, and teacher have access
router.get(
  "/date/:date/:classId",
  authenticateUser,
  authorizeRole(["superadmin", "academic_coordinator", "teacher"]),
  getAttendanceByDateAndClass
);

// GET class & section–wise attendance summary for today's date – Only superadmin, academic_coordinator, and teacher have access
router.get(
  "/summary/today",
  authenticateUser,
  authorizeRole(["superadmin", "academic_coordinator", "teacher"]),
  getClassAndSectionWiseSummaryForToday
);

// GET class & section–wise attendance summary for a selected date – Only superadmin, academic_coordinator, and teacher have access
router.get(
  "/summary/:date",
  authenticateUser,
  authorizeRole(["superadmin", "academic_coordinator", "teacher"]),
  getClassAndSectionWiseSummaryByDate
);

// GET an attendance record by ID – Only superadmin, academic_coordinator, and teacher have access
router.get(
  "/:id",
  authenticateUser,
  authorizeRole(["superadmin", "academic_coordinator", "teacher"]),
  getAttendanceById
);

// Update an attendance record – Only superadmin, academic_coordinator, and teacher have access
router.put(
  "/:id",
  authenticateUser,
  authorizeRole(["superadmin", "academic_coordinator", "teacher"]),
  updateAttendance
);

// Delete an attendance record – Only superadmin, academic_coordinator, and teacher have access
router.delete(
  "/:id",
  authenticateUser,
  authorizeRole(["superadmin", "academic_coordinator", "teacher"]),
  deleteAttendance
);

// GET attendance records for the logged-in student – Accessible to students
router.get(
  "/student/me",
  authenticateUser,
  authorizeRole(["student"]),
  getAttendanceForLoggedInStudent
);

module.exports = router;
