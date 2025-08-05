const express = require("express");
const router = express.Router();
const sectionController = require("../controllers/sectionController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// Create a section – Only Admin & Super Admin can access
router.post(
  "/",
  authenticateUser,
  authorizeRole(["admin", "superadmin"]),
  sectionController.createSection
);

// Get all sections – Free from role-based authorization (only authentication required)
router.get(
  "/",
  authenticateUser,
  sectionController.getAllSections
);

// Get a section by ID – Free from role-based authorization (only authentication required)
router.get(
  "/:id",
  authenticateUser,
  sectionController.getSectionById
);

// Update a section – Only Admin & Super Admin can access
router.put(
  "/:id",
  authenticateUser,
  authorizeRole(["admin", "superadmin"]),
  sectionController.updateSection
);

// Delete a section – Free from role-based authorization (only authentication required)
router.delete(
  "/:id",
  authenticateUser,
  sectionController.deleteSection
);

module.exports = router;
