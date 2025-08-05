const express = require("express");
const router = express.Router();
const schoolController = require("../controllers/schoolController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware"); 

// Protect all school routes except the GET route
router.post("/", authenticateUser, authorizeRole(["admin", "superadmin"]), schoolController.createSchool);
router.get("/", schoolController.getAllSchools); // No authentication or authorization
router.get("/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), schoolController.getSchoolById);
router.put("/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), schoolController.updateSchool);
router.delete("/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), schoolController.deleteSchool);

module.exports = router;
