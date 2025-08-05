const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware'); // Reuse the same Multer configuration
const circularController = require('../controllers/circularController');
const { authenticateUser, authorizeRole } = require('../middlewares/authMiddleware');

// Create a new circular – for academic coordinators/teachers (adjust roles as needed), with file upload support
router.post(
  '/',
  authenticateUser,
  authorizeRole(['academic_coordinator', 'teacher']),
  upload.single('file'),
  circularController.createCircular
);

// Get all circulars – accessible to authenticated users (adjust roles as needed)
router.get(
  '/',
  authenticateUser,
  circularController.getCirculars
);

// Update a circular by ID – for academic coordinators/teachers, with file upload support (if a new file is provided)
router.put(
  '/:id',
  authenticateUser,
  authorizeRole(['academic_coordinator', 'teacher']),
  upload.single('file'),
  circularController.updateCircular
);

// Delete a circular by ID – for academic coordinators/teachers
router.delete(
  '/:id',
  authenticateUser,
  authorizeRole(['academic_coordinator', 'teacher']),
  circularController.deleteCircular
);

module.exports = router;
