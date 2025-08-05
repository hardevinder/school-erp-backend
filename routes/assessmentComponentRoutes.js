const express = require("express");
const router = express.Router();
const controller = require("../controllers/assessmentComponentController");

const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");
const allowAcademicOrAdmin = authorizeRole(["academic_coordinator", "admin", "superadmin"]);

router.get("/", authenticateUser, controller.getAllComponents);
router.post("/", authenticateUser, allowAcademicOrAdmin, controller.createComponent);
router.put("/:id", authenticateUser, allowAcademicOrAdmin, controller.updateComponent);
router.delete("/:id", authenticateUser, allowAcademicOrAdmin, controller.deleteComponent);

module.exports = router;
