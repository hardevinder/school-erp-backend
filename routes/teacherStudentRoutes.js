const express = require('express');
const router = express.Router();
const { getStudentsForTeacherClasses } = require('../controllers/teacherStudentController');
const { authenticateUser, authorizeRole } = require('../middlewares/authMiddleware');

// GET /teacher/students - Lists students from teacher's assigned classes
router.get(
  '/students',
  authenticateUser,
  authorizeRole(['teacher']),
  getStudentsForTeacherClasses
);

module.exports = router;
