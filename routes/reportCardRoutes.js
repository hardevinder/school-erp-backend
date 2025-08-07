const express = require("express");
const router = express.Router();
const controller = require("../controllers/reportCardController");
const { authenticateUser } = require("../middlewares/authMiddleware");

// 🔍 Get student list for report card
router.get("/students", authenticateUser, controller.getReportCardStudents);

// 📊 Get scholastic summary for report card
router.post("/scholastic-summary", authenticateUser, controller.getScholasticSummary);

// 📘 Get Co-Scholastic Grades per student
router.get("/coscholastic-summary", authenticateUser, controller.getCoScholasticGradesForStudents);

// 💬 Get Student Remarks Summary per term
router.get("/remarks-summary", authenticateUser, controller.getRemarksSummary);

// 📅 Get Attendance Summary per student (within term date range)
router.get("/attendance-summary", authenticateUser, controller.getAttendanceSummary);

// 🎨 Get Report Card Format (header/footer/logo) by class
router.get("/format-by-class", authenticateUser, controller.getReportCardFormatByClass);

module.exports = router;
