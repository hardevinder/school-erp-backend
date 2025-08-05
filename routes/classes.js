const express = require("express");
const router = express.Router();
const {
  getAllClasses,
  addClass,
  getClassById,
  updateClass,
  deleteClass,
} = require("../controllers/classesController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// GET all classes – Now accessible to all (no authentication middleware)
router.get("/", getAllClasses);

// Create a class – Only Admin & Super Admin can access (protected)
router.post("/", authenticateUser, authorizeRole(["admin", "superadmin"]), addClass);

// GET a class by ID – Only authentication required
router.get("/:id", authenticateUser, getClassById);

// Update a class – Only Admin & Super Admin can access (protected)
router.put("/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), updateClass);

// Delete a class – Only authentication required
router.delete("/:id", authenticateUser, deleteClass);

module.exports = router;
