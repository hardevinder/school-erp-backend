const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");
const upload = require("../utils/multerConfig");

// Public Routes
router.get("/", studentController.getAllStudents);
router.get("/admission/:admission_number", studentController.searchByAdmissionNumber);
router.get("/class/:class_id", studentController.searchByClass);
router.get("/searchByClassAndSection", studentController.searchByClassAndSection);
router.get("/:studentId/fee-details", studentController.getStudentFeeDetails);
router.get("/export-students", studentController.exportStudents);


// Protected Routes – Only Admin & Super Admin
router.post("/add", authenticateUser, authorizeRole(["admin", "superadmin"]), studentController.addStudent);
router.put("/edit/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), studentController.editStudent);
router.delete("/delete/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), studentController.deleteStudent);
router.patch("/status/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), studentController.toggleStudentStatus);
router.post("/import-students", authenticateUser, authorizeRole(["admin", "superadmin"]), upload.single("file"), studentController.importStudents);
// Duplicate toggle route: Consider removing one if not needed.
router.put("/toggle/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), studentController.toggleStudentStatus);

// This route retrieves details of the logged in student
router.get("/me", authenticateUser, authorizeRole(["admin", "superadmin","student"]), studentController.getLoggedInStudentDetails);

module.exports = router;
