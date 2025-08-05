const express = require("express");
const router = express.Router();
const {
  createSubstitution,
  getAllSubstitutions,
  getSubstitutionById,
  updateSubstitution,
  deleteSubstitution,
  getSubstitutionsByDate, // Existing endpoint
  getSubstitutionsForOriginalTeacherByDate, // Existing endpoint for original teacher by date
  getSubstitutionsForTeacherByDate, // Existing endpoint for teacherId match by date
  getStudentSubstitutions, // New endpoint for student substitutions
  getTeacherSubstitutions, // New endpoint for logged-in teacher substitutions (teacher is substitute)
  getOriginalTeacherSubstitutions // New endpoint for logged-in teacher as original teacher (substituited)
} = require("../controllers/substitutionController");

const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// Create a new Substitution - Only admin, super_admin, and academic_coordinator
router.post(
  "/",
  authenticateUser,
  authorizeRole(["admin", "super_admin", "academic_coordinator"]),
  createSubstitution
);

// Get all Substitutions - Open to all authenticated users
router.get("/", authenticateUser, getAllSubstitutions);

// Get substitutions filtered by date - Open to all authenticated users
// Example: GET http://localhost:3000/substitutions/by-date?date=2025-02-27
router.get("/by-date", authenticateUser, getSubstitutionsByDate);

// New route: Get substitutions filtered by date where the logged in teacher is the original teacher.
// Example: GET http://localhost:3000/substitutions/by-date/original?date=2025-02-27
router.get("/by-date/original", authenticateUser, getSubstitutionsForOriginalTeacherByDate);

// New route: Get substitutions filtered by date where the logged in teacher matches teacherId.
// Example: GET http://localhost:3000/substitutions/by-date/substituted?date=2025-02-27
router.get("/by-date/substituted", authenticateUser, getSubstitutionsForTeacherByDate);

// New route: Get substitutions for the student based on their class.
// Only accessible to authenticated users with the "student" role.
// Example: GET http://localhost:3000/substitutions/by-date/student?date=2025-02-27
router.get("/by-date/student", authenticateUser, authorizeRole(["student"]), getStudentSubstitutions);

// New route: Get substitutions for the logged-in teacher (where the teacher is the substitute)
// Example: GET http://localhost:3000/substitutions/teacher
router.get("/teacher", authenticateUser, getTeacherSubstitutions);

// New route: Get substitutions where the logged-in teacher is the original teacher (i.e. teacher-substituited)
// Example: GET http://localhost:3000/substitutions/teacher-substituited
router.get("/teacher-substituited", authenticateUser, getOriginalTeacherSubstitutions);

// Get a specific Substitution by ID - Open to all authenticated users
router.get("/:id", authenticateUser, getSubstitutionById);

// Update a Substitution - Only admin, super_admin, and academic_coordinator
router.put(
  "/:id",
  authenticateUser,
  authorizeRole(["admin", "super_admin", "academic_coordinator"]),
  updateSubstitution
);

// Delete a Substitution - Only admin, super_admin, and academic_coordinator
router.delete(
  "/:id",
  authenticateUser,
  authorizeRole(["admin", "super_admin", "academic_coordinator"]),
  deleteSubstitution
);

module.exports = router;
