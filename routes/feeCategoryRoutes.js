const express = require("express");
const router = express.Router();
const feeCategoryController = require("../controllers/feeCategoryController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware"); // Import middleware

// Protect routes – Only Admin & Super Admin can access
router.post("/", authenticateUser, authorizeRole(["admin", "superadmin"]), feeCategoryController.createFeeCategory);
router.get("/", authenticateUser, authorizeRole(["admin", "superadmin"]), feeCategoryController.getAllFeeCategories);
router.get("/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), feeCategoryController.getFeeCategoryById);
router.put("/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), feeCategoryController.updateFeeCategory);
router.delete("/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), feeCategoryController.deleteFeeCategory);

module.exports = router;
