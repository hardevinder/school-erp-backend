const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware"); // Import middleware

// Protect all report routes – Only Admin & Super Admin can access
router.get("/day-wise", authenticateUser, authorizeRole(["admin", "superadmin"]), reportController.getDayWiseReport);
router.get("/complete", authenticateUser, authorizeRole(["admin", "superadmin"]), reportController.getCompleteReport);
router.get("/current-month", authenticateUser, authorizeRole(["admin", "superadmin"]), reportController.getCurrentMonthReport);
router.get("/day-wise-summary", authenticateUser, authorizeRole(["admin", "superadmin"]), reportController.getDayWiseSummary);
router.get("/class-wise-student-count", authenticateUser, authorizeRole(["admin", "superadmin"]), reportController.getClassWiseStudentCount);

module.exports = router;
