const express = require("express");
const router = express.Router();
const StudentResultReportController = require("../controllers/StudentResultReportController");

router.post("/generate-pdf", StudentResultReportController.generatePDFReport);

module.exports = router;
