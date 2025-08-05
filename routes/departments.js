const express = require("express");
const router = express.Router();
const departmentController = require("../controllers/departmentController");
const {
  authenticateUser,
  authorizeRole,
} = require("../middlewares/authMiddleware");

const allowAdminHRSuperadmin = authorizeRole(["admin", "hr", "superadmin"]);
const allowSuperadminOnly = authorizeRole(["superadmin"]);

router.use(authenticateUser);

// Active Department Routes
router.get("/", allowAdminHRSuperadmin, departmentController.getDepartments);
router.post("/", allowAdminHRSuperadmin, departmentController.createDepartment);
router.put("/:id", allowAdminHRSuperadmin, departmentController.updateDepartment);
router.delete("/:id", allowAdminHRSuperadmin, departmentController.deleteDepartment); // ✅ soft delete

// Trash/Restore Routes
router.get("/trashed", allowAdminHRSuperadmin, departmentController.getTrashedDepartments); // ✅ view trashed
router.post("/:id/restore", allowAdminHRSuperadmin, departmentController.restoreDepartment); // ✅ restore

// Permanent Delete Route — ❌ Only Superadmin
router.delete("/:id/force", allowSuperadminOnly, departmentController.permanentDeleteDepartment);

module.exports = router;
