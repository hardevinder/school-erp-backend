const express = require("express");
const router = express.Router();
const {
  createPeriod,
  getAllPeriods,
  getPeriodById,
  updatePeriod,
  deletePeriod
} = require("../controllers/periodController");

const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// Routes for creating, updating, and deleting periods (restricted to Admin, SuperAdmin, and Academic Coordinator)
router.post("/", authenticateUser, authorizeRole(["admin", "superAdmin", "academic_coordinator"]), createPeriod);
router.put("/:id", authenticateUser, authorizeRole(["admin", "superAdmin", "academic_coordinator"]), updatePeriod);
router.delete("/:id", authenticateUser, authorizeRole(["admin", "superAdmin", "academic_coordinator"]), deletePeriod);

// Routes for viewing periods (open to all)
router.get("/", getAllPeriods);
router.get("/:id", getPeriodById);

module.exports = router;
