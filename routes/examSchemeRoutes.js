const express = require("express");
const router = express.Router();
const examSchemeController = require("../controllers/examSchemeController");
const { authenticateUser } = require("../middlewares/authMiddleware");

// ==============================
// Exam Scheme CRUD
// ==============================
router.get("/", examSchemeController.getAllSchemes);
router.post("/", examSchemeController.createScheme);
router.put("/:id", examSchemeController.updateScheme);
router.delete("/:id", examSchemeController.deleteScheme);

// ==============================
// Excel Import/Export
// ==============================
router.get("/export", examSchemeController.exportSchemesToExcel);
router.post("/import", examSchemeController.importSchemesFromExcel);

// ==============================
// Reorder Schemes
// ==============================
router.post("/reorder", examSchemeController.reorderSchemes);

// ==============================
// ✅ Get Components for class + subject + exam
// ==============================
router.get(
  "/components",
  authenticateUser,
  examSchemeController.getComponentsForSubjectAndExam
);

// ==============================
// ✅ NEW: Get Components Grouped by Subject for Class + Section + Exam
// ==============================
router.get(
  "/components-by-class",
  authenticateUser,
  examSchemeController.getComponentsByClassSectionExam
);

// ==============================
// ✅ Lock/Unlock individual Exam Scheme Component
// ==============================
router.patch(
  "/:id/lock",
  authenticateUser,
  examSchemeController.toggleLockScheme
);

// ✅ Term-wise components grouped by term for a subject (used in Final Report)
router.get(
  "/components/term-wise",
  authenticateUser,
  examSchemeController.getTermWiseComponents
);

module.exports = router;
