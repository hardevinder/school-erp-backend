const express = require("express");
const router = express.Router();
const StudentAppController = require("../controllers/StudentAppController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// ✅ Route to get student details by Admission Number (Accessible only by students)
router.get("/:admission_number", authenticateUser, authorizeRole(["student"]), StudentAppController.getStudentByAdmissionNumber);

// New route: Get fee data by admission number (Accessible only by students)
// Note: Ensure that the parameter name (admissionNumber) matches what you expect in the controller.
router.get("/admission/:admissionNumber/fees", authenticateUser, authorizeRole(["student"]), StudentAppController.getFeeDataByAdmissionNumber);
router.get("/feehistory/:admissionNumber", authenticateUser, authorizeRole(["student"]), StudentAppController.searchByAdmissionNumber); // Search by admission number

module.exports = router;
