const express = require("express");
const router = express.Router();

const feeController = require("../controllers/feeDueController");
const summaryController = require("../controllers/SchoolFeeSummaryController");
const { getConcessionReport } = require('../controllers/ConcessionReportController');
const { getVanFeeDetailedReport } = require('../controllers/VanFeeReportController'); // ✅ added

const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// ✅ Class-wise fee details
router.get(
  "/class/:classId/fees",
  authenticateUser,
  authorizeRole(["admin", "superadmin"]),
  feeController.getFeeDataByClass
);

// ✅ Full school fee summary
router.get(
  "/school-fee-summary",
  authenticateUser,
  authorizeRole(["admin", "superadmin"]),
  summaryController.getSchoolFeeSummary
);

// ✅ Concession Report (protected now)
router.get(
  "/concession-report",
  authenticateUser,
  authorizeRole(["admin", "superadmin"]),
  getConcessionReport
);

// ✅ Van Fee Detailed Report (new & protected)
router.get(
  "/van-fee-detailed-report",
  authenticateUser,
  authorizeRole(["admin", "superadmin"]),
  getVanFeeDetailedReport
);

module.exports = router;
