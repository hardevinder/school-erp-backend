const express = require("express");
const router = express.Router();
const {
  createLessonPlan,
  getLessonPlans,
  getLessonPlanById,
  updateLessonPlan,
  deleteLessonPlan,
} = require("../controllers/lessonPlanController");

const { authenticateUser } = require("../middlewares/authMiddleware");

// Create a new lesson plan
router.post("/", authenticateUser, createLessonPlan);

// Get all lesson plans for the logged in teacher
router.get("/", authenticateUser, getLessonPlans);

// Get a single lesson plan by ID
router.get("/:id", authenticateUser, getLessonPlanById);

// Update a lesson plan by ID
router.put("/:id", authenticateUser, updateLessonPlan);

// Delete a lesson plan by ID
router.delete("/:id", authenticateUser, deleteLessonPlan);

module.exports = router;
