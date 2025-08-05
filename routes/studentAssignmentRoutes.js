const express = require('express');
const router = express.Router();
const {
  assignToStudents,
  getAssignmentsForTeacher,
  getAssignmentsForStudent, // Newly added controller function for student assignments
  updateAssignmentStatus,
  deleteStudentAssignmentsByDate,
} = require('../controllers/studentAssignmentController');
const { authenticateUser, authorizeRole } = require('../middlewares/authMiddleware');

// POST /assignments/:id/assign - Assign an assignment to multiple students (Teacher only)
router.post(
  '/:id/assign',
  authenticateUser,
  authorizeRole(['teacher']),
  assignToStudents
);

// GET /assignments/teacher - Get assignments for the authenticated teacher (Teacher only)
router.get(
  '/',
  authenticateUser,
  authorizeRole(['teacher']),
  getAssignmentsForTeacher
);

// GET /assignments/student - Get assignments for the authenticated student (Student only)
router.get(
  '/student',
  authenticateUser,
  authorizeRole(['student']),
  getAssignmentsForStudent
);

// PUT /assignments/:id - Update a student-assignment status (accessible to both teacher and student, adjust as needed)
router.put(
  '/:id',
  authenticateUser,
  updateAssignmentStatus
);

// DELETE /assignments/by-date/:date - Delete student assignment records for a specific date (Teacher only)
router.delete(
  '/by-date/:date',
  authenticateUser,
  authorizeRole(['teacher']),
  deleteStudentAssignmentsByDate
);

module.exports = router;
