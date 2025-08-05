const express = require("express");
const router = express.Router();

const controller = require("../controllers/coScholasticGradeController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// 🔐 Only coordinators and superadmins can write
const allowCoordinators = authorizeRole(["academic_coordinator", "superadmin"]);

// ✅ GET route — now open to everyone (even unauthenticated users)
router.get("/", controller.getGrades);

// ✅ CRUD — restricted
router.post("/", authenticateUser, allowCoordinators, controller.createGrade);
router.put("/:id", authenticateUser, allowCoordinators, controller.updateGrade);
router.delete("/:id", authenticateUser, allowCoordinators, controller.deleteGrade);

module.exports = router;
