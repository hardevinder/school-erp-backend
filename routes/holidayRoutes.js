const express = require("express");
const router = express.Router();
const {
  createHoliday,
  getAllHolidays,
  getHolidayById,
  updateHoliday,
  deleteHoliday,
  getHolidaySummaryByMonth,  // <-- Import the summary function
} = require("../controllers/holidayController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// Create a holiday – allow admin, superadmin, academic_coordinator, and teacher
router.post(
  "/",
  authenticateUser,
  authorizeRole(["admin", "superadmin", "academic_coordinator", "teacher"]),
  createHoliday
);

// New route: Get holiday summary grouped month-wise – open to all users
router.get("/summary-by-month", getHolidaySummaryByMonth);

// Get all holidays – open to all users
router.get("/", getAllHolidays);

// Get a holiday by ID – open to all users
router.get("/:id", getHolidayById);

// Update a holiday – allow only admin, superadmin, and academic_coordinator (teacher excluded)
router.put(
  "/:id",
  authenticateUser,
  authorizeRole(["admin", "superadmin", "academic_coordinator"]),
  updateHoliday
);

// Delete a holiday – restrict deletion to admin, superadmin, and academic_coordinator (teacher excluded)
router.delete(
  "/:id",
  authenticateUser,
  authorizeRole(["admin", "superadmin", "academic_coordinator"]),
  deleteHoliday
);

module.exports = router;
