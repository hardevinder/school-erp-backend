const express = require("express");
const router = express.Router();
const finalReportPdfController = require("../controllers/finalReportPdfController");

// 🎯 Route for generating Final Report PDF
router.post("/final-summary-pdf", finalReportPdfController.generateFinalReportPDF);

module.exports = router;
