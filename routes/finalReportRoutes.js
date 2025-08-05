const express = require("express");
const router = express.Router();
const controller = require("../controllers/finalReportController");

// 💡 Optional: Runtime check to avoid undefined function errors
if (!controller.getFinalReportSummary || !controller.generateFinalReportPDF) {
  console.error("❌ Missing required controller functions in finalReportController.js");
  throw new Error("Controller functions not properly defined or exported.");
}

// ✅ Final Report Summary with term-wise + combined weighted totals (JSON)
router.post("/final-summary", controller.getFinalReportSummary);

// ✅ Generate Final Report PDF from frontend-provided HTML
router.post("/generate-pdf", controller.generateFinalReportPDF);

module.exports = router;
