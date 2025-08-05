// routes/subjects.js

const express = require('express');
const router = express.Router();
const { 
  createSubject, 
  getSubjects, 
  getSubjectById, 
  updateSubject, 
  deleteSubject 
} = require('../controllers/subjectController');
const { authenticateUser, authorizeRole } = require('../middlewares/authMiddleware');

// Only academic_coordinator can access these endpoints
router.post('/', authenticateUser, authorizeRole(['academic_coordinator',]), createSubject);
router.get('/', authenticateUser, authorizeRole(['academic_coordinator','teacher','student','admin','super_admin']), getSubjects);
router.get('/:id', authenticateUser, authorizeRole(['academic_coordinator']), getSubjectById);
router.put('/:id', authenticateUser, authorizeRole(['academic_coordinator']), updateSubject);
router.delete('/:id', authenticateUser, authorizeRole(['academic_coordinator']), deleteSubject);

module.exports = router;
