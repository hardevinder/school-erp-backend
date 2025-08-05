const express = require("express");
const router = express.Router();
const examController = require("../controllers/examController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// Allow only Academic Coordinators and Superadmins for critical actions
const allowCoordinators = authorizeRole(["academic_coordinator", "superadmin"]);

// 🔍 Get Class → Exam → Subjects structure from ExamSchemes
router.get("/class-exam-subjects", authenticateUser, examController.getClassExamSubjectStructure);

// 📋 List all exams
router.get("/", authenticateUser, examController.getAllExams);

// 📄 Get one exam by ID
router.get("/:id", authenticateUser, examController.getExamById);

// ➕ Create new exam
router.post("/", authenticateUser, allowCoordinators, examController.createExam);

// ✏️ Update existing exam
router.put("/:id", authenticateUser, allowCoordinators, examController.updateExam);

// ❌ Delete an exam
router.delete("/:id", authenticateUser, allowCoordinators, examController.deleteExam);

// 🔒 Lock or Unlock exam
router.post("/lock", authenticateUser, allowCoordinators, examController.toggleExamLock);

module.exports = router;
