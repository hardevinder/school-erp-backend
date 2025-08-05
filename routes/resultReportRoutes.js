const express = require("express");
const router = express.Router();
const resultReportGenerator = require("../controllers/resultReportGenerator");

router.post("/generate-pdf", resultReportGenerator.generatePDFReport);

module.exports = router;
