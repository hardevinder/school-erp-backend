const express = require("express");
const router = express.Router();
const controller = require("../controllers/coScholasticAreaController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// 🔐 Restrict create/update/delete to these roles
const allowCoordinators = authorizeRole(["academic_coordinator", "superadmin"]);

// ✅ GET all areas – accessible to all authenticated users
router.get("/", authenticateUser, controller.getAreas);

// ✅ Create new area – only for coordinators/superadmin
router.post("/", authenticateUser, allowCoordinators, controller.createArea);

// ✅ Update area – only for coordinators/superadmin
router.put("/:id", authenticateUser, allowCoordinators, controller.updateArea);

// ✅ Delete area – only for coordinators/superadmin
router.delete("/:id", authenticateUser, allowCoordinators, controller.deleteArea);

module.exports = router;
