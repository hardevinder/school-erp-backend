const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware'); // Import Multer middleware
const assignmentController = require('../controllers/assignmentController');
const { authenticateUser, authorizeRole } = require('../middlewares/authMiddleware');

// Create a new assignment – for teachers only, with multiple file upload support
router.post(
  '/',
  authenticateUser,
  authorizeRole(['teacher']),
  upload.array('files'),
  assignmentController.createAssignment
);

// Create a new assignment with a single file upload – for teachers only
router.post(
  '/single',
  authenticateUser,
  authorizeRole(['teacher']),
  upload.single('file'),
  assignmentController.createAssignmentSingle
);

// Get all assignments – for teachers only
router.get(
  '/',
  authenticateUser,
  authorizeRole(['teacher']),
  assignmentController.getAssignments
);

// Get a single assignment by ID – for teachers only
router.get(
  '/:id',
  authenticateUser,
  authorizeRole(['teacher']),
  assignmentController.getAssignmentById
);

// Update an assignment by ID – for teachers only, with file upload support
router.put(
  '/:id',
  authenticateUser,
  authorizeRole(['teacher']),
  upload.array('files'),
  assignmentController.updateAssignment
);

// Delete an assignment by ID – for teachers only
router.delete(
  '/:id',
  authenticateUser,
  authorizeRole(['teacher']),
  assignmentController.deleteAssignment
);

module.exports = router;
