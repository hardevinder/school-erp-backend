const express = require("express");
const router = express.Router();
const {
  createRecord,
  getAllRecords,
  getRecordById,
  updateRecord,
  deleteRecord,
  getDetailsByClassId,
  getDetailsByTeacherId, // still available if needed
  getLoggedInTeacherDetails,  // New endpoint for logged in teacher details
  getStudentTimetable,        // New endpoint for logged in student timetable
  getTeacherWorkload          // Teacher workload endpoint
} = require("../controllers/periodClassTeacherSubjectController");

const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// Create a new record - Only admin, super_admin, and academic_coordinator
router.post(
  "/",
  authenticateUser,
  authorizeRole(["admin", "super_admin", "academic_coordinator"]),
  createRecord
);

// Get all records - Open to all authenticated users
router.get("/", authenticateUser, getAllRecords);

// Get timetable details by class id - Open to all authenticated users
router.get("/class/:classId", authenticateUser, getDetailsByClassId);

// Get timetable details by teacher id using URL parameter - Open to all authenticated users
router.get("/timetable-teacher/:teacherId", authenticateUser, getDetailsByTeacherId);

// Get timetable details for the logged in teacher (teacherId derived from req.user)
// No need for a teacherId parameter in the URL.
router.get("/timetable-teacher", authenticateUser, getLoggedInTeacherDetails);

// Get teacher workload (weekly & daily) by teacherId - Open to all authenticated users
router.get("/teacher-workload/:teacherId", authenticateUser, getTeacherWorkload);

// NEW: Get teacher availability by day and period via query parameters
router.get("/teacher-availability", authenticateUser, async (req, res, next) => {
  try {
    // Expecting query parameters: day and periodId
    const { day, periodId } = req.query;
    if (!day || !periodId) {
      return res.status(400).json({ error: "Query parameters 'day' and 'periodId' are required." });
    }
    // Use the existing controller function for teacher availability by day.
    const { getTeacherAvailability } = require("../controllers/periodClassTeacherSubjectController");
    return await getTeacherAvailability(req, res);
  } catch (error) {
    next(error);
  }
});

// NEW: Get teacher availability by date and period via query parameters.
// This endpoint excludes teachers who are already assigned a substitution for the given date.
router.get("/teacher-availability-by-date", authenticateUser, async (req, res, next) => {
  try {
    // Expecting query parameters: date and periodId
    const { date, periodId } = req.query;
    if (!date || !periodId) {
      return res.status(400).json({ error: "Query parameters 'date' and 'periodId' are required." });
    }
    // Use the dedicated controller function for teacher availability by date.
    const { getTeacherAvailabilityForDate } = require("../controllers/periodClassTeacherSubjectController");
    return await getTeacherAvailabilityForDate(req, res);
  } catch (error) {
    next(error);
  }
});

// Get a specific record by ID - Open to all authenticated users
router.get("/:id", authenticateUser, getRecordById);

// This route returns the timetable for the logged in student based on their class_id.
router.get('/student/timetable', authenticateUser, getStudentTimetable);

// Update a record - Only admin, super_admin, and academic_coordinator
router.put(
  "/:id",
  authenticateUser,
  authorizeRole(["admin", "super_admin", "academic_coordinator"]),
  updateRecord
);

// Delete a record - Only admin, super_admin, and academic_coordinator
router.delete(
  "/:id",
  authenticateUser,
  authorizeRole(["admin", "super_admin", "academic_coordinator"]),
  deleteRecord
);

module.exports = router;
