const express = require("express");
const router = express.Router();
const {
  createClassSubjectTeacher,
  getAllClassSubjectTeachers,
  getClassSubjectTeacherById,
  updateClassSubjectTeacher,
  deleteClassSubjectTeacher,
  getSubjectsForTeacher  // New function for fetching subjects for the logged in teacher
} = require("../controllers/classSubjectTeacherController");

const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// Mapping routes – Only Academic Coordinator and Admin can access these endpoints
router.post("/", authenticateUser, authorizeRole(["admin", "academic_coordinator"]), createClassSubjectTeacher);
router.get("/", authenticateUser, authorizeRole(["admin", "academic_coordinator"]), getAllClassSubjectTeachers);
router.get("/:id", authenticateUser, authorizeRole(["admin", "academic_coordinator"]), getClassSubjectTeacherById);
router.put("/:id", authenticateUser, authorizeRole(["admin", "academic_coordinator"]), updateClassSubjectTeacher);
router.delete("/:id", authenticateUser, authorizeRole(["admin", "academic_coordinator"]), deleteClassSubjectTeacher);

// New route: Get subjects assigned to the logged in teacher
router.get("/teacher/class-subjects", authenticateUser, getSubjectsForTeacher);



module.exports = router;
