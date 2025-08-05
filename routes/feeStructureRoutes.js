const express = require("express");
const router = express.Router();
const feeStructureController = require("../controllers/feeStructureController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware"); // Middleware to verify login

// Protect all routes – Only Admin & Super Admin can access
router.get("/", authenticateUser, authorizeRole(["admin", "superadmin"]), feeStructureController.getAllFees);
router.get("/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), feeStructureController.getFeeById);
router.post("/", authenticateUser, authorizeRole(["admin", "superadmin"]), feeStructureController.createFee);
router.put("/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), feeStructureController.updateFee);
router.delete("/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), feeStructureController.deleteFee);

// Route to get fees by class_id
router.get("/class/:class_id", authenticateUser, authorizeRole(["admin", "superadmin"]), feeStructureController.getFeesByClassId);

module.exports = router;
