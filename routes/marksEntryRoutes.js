const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const marksEntryController = require("../controllers/studentExamResultController");
const { authenticateUser } = require("../middlewares/authMiddleware");

// =============================================
// ✅ Marks Entry Routes
// =============================================

// ✅ GET: Fetch students and assessment components for marks entry
router.get("/", authenticateUser, marksEntryController.getMarksEntryData);

// ✅ POST: Save or update student marks
router.post("/save", authenticateUser, marksEntryController.saveMarksEntry);

// ✅ GET: Export Excel template with students and components
router.get("/export", authenticateUser, marksEntryController.exportMarksEntryExcel);

// ✅ POST: Import filled Excel to update marks
router.post("/import", authenticateUser, upload.single("file"), marksEntryController.importMarksEntryExcel);

// 🔁 Change GET → POST here
router.post("/report-summary", authenticateUser, marksEntryController.getReportSummary);


module.exports = router;
