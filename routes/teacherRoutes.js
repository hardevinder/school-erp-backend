// routes/teacherRoutes.js
const express = require("express");
const router = express.Router();
const { getTeachers } = require("../controllers/teacherController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// Only allow admin, superadmin, and academic_coordinator roles to fetch teachers
router.get(
  "/",
  authenticateUser,
  authorizeRole(["admin", "superadmin", "academic_coordinator"]),
  getTeachers
);

module.exports = router;
