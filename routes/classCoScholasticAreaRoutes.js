const express = require("express");
const router = express.Router();
const controller = require("../controllers/studentCoScholasticEvaluationController");
const { authenticateUser } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware"); // For Excel import

// ✅ Fetch all evaluations (for class/section/term)
router.get("/", authenticateUser, controller.getEvaluations);

// ✅ Save/Update evaluations (bulk)
router.post("/", authenticateUser, controller.saveEvaluations);

// ✅ Lock evaluations
router.post("/lock", authenticateUser, controller.lockEvaluations);

// ✅ Export evaluations to Excel
router.get("/export", authenticateUser, controller.exportEvaluations);

// ✅ Import from Excel
router.post("/import", authenticateUser, upload.single("file"), controller.importEvaluations);



module.exports = router;
