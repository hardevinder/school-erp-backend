const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const controller = require("../controllers/studentCoScholasticEvaluationController");
const { authenticateUser } = require("../middlewares/authMiddleware");

// =============================================
// ✅ Co-Scholastic Evaluation Routes
// =============================================

// ✅ GET: Fetch students and co-scholastic areas with existing evaluations
router.get("/", authenticateUser, controller.getEvaluations);

// ✅ POST: Save or update evaluations (grade & remarks)
router.post("/save", authenticateUser, controller.saveEvaluations);

// ✅ GET: Export Excel template with students and co-scholastic areas
router.get("/export", authenticateUser, controller.exportEvaluations);

// ✅ POST: Import filled Excel to update evaluations
router.post("/import", authenticateUser, upload.single("file"), controller.importEvaluations);

// ✅ PATCH: Lock evaluations for given class-section-term
router.patch("/lock", authenticateUser, controller.lockEvaluations);

// ✅ GET: Fetch class list assigned to incharge that have co-scholastic mappings
router.get("/assigned-classes", authenticateUser, controller.getAssignedClasses);

// ✅ GET: Fetch co-scholastic areas mapped for given class (and optional term)
router.get("/areas", authenticateUser, controller.getCoScholasticAreas);

module.exports = router;
