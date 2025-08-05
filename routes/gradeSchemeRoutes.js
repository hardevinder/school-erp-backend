const express = require("express");
const router = express.Router();
const multer = require("multer");
const controller = require("../controllers/gradeSchemeController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// Multer setup for file upload
const upload = multer({ dest: "uploads/" });

// Restrict for create/update/delete/import
const allowCoordinators = authorizeRole(["academic_coordinator", "superadmin"]);

// ✅ GET routes accessible to all authenticated users
router.get("/", authenticateUser, controller.getAllGrades);
router.get("/export", authenticateUser, controller.exportGradeSchemes);

// ✅ Other routes restricted to coordinators/superadmin
router.post("/", authenticateUser, allowCoordinators, controller.createGradeScheme);
router.put("/:id", authenticateUser, allowCoordinators, controller.updateGradeScheme);
router.delete("/:id", authenticateUser, allowCoordinators, controller.deleteGradeScheme);
router.post("/import", authenticateUser, allowCoordinators, upload.single("file"), controller.importGradeSchemes);

module.exports = router;
