const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employeeController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// Role guards
const allowHRandSuperadmin = authorizeRole(["hr", "superadmin"]);
const allowSuperadminOnly   = authorizeRole(["superadmin"]);

// ─────── CRUD ────────────────────────────────────────────
// Create new employee
router.post(
  "/",
  authenticateUser,
  allowHRandSuperadmin,
  employeeController.createEmployee
);

// Read (with optional search/filter query params)
router.get(
  "/",
  authenticateUser,
  allowHRandSuperadmin,
  employeeController.getEmployees
);

// Update existing employee
router.put(
  "/:id",
  authenticateUser,
  allowHRandSuperadmin,
  employeeController.updateEmployee
);

// Delete (hard delete) — superadmin only
router.delete(
  "/:id",
  authenticateUser,
  allowSuperadminOnly,
  employeeController.deleteEmployee
);

// ─────── EXPORT / IMPORT ──────────────────────────────────
// Download blank Excel template
router.get(
  "/export-template",
  authenticateUser,
  allowHRandSuperadmin,
  employeeController.exportEmployeeTemplate
);

// Download full (or filtered) employee data
router.get(
  "/export",
  authenticateUser,
  allowHRandSuperadmin,
  employeeController.exportEmployeesData
);

// Upload & import from Excel
router.post(
  "/import",
  authenticateUser,
  allowHRandSuperadmin,
  employeeController.uploadMiddleware,
  employeeController.importEmployees
);

module.exports = router;
