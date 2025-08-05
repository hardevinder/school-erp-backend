// routes/employeeLeaveTypes.js
const express = require("express");
const router = express.Router();
const leaveTypeController = require("../controllers/employeeLeaveTypeController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// — GET /employee‑leave‑types/
//    • List all leave types
//    • Open to any logged‑in user
router.get(
  "/",
  authenticateUser,
  leaveTypeController.getLeaveTypes
);

// — POST /employee‑leave‑types/
//    • Create a new leave type
//    • Restricted to HR, Admin & Superadmin
router.post(
  "/",
  authenticateUser,
  authorizeRole(["hr", "admin", "superadmin"]),
  leaveTypeController.createLeaveType
);

// — PUT /employee‑leave‑types/:id
//    • Update an existing leave type
//    • Restricted to HR, Admin & Superadmin
router.put(
  "/:id",
  authenticateUser,
  authorizeRole(["hr", "admin", "superadmin"]),
  leaveTypeController.updateLeaveType
);

// — DELETE /employee‑leave‑types/:id
//    • Remove a leave type
//    • Restricted to Superadmin only
router.delete(
  "/:id",
  authenticateUser,
  authorizeRole(["superadmin"]),
  leaveTypeController.deleteLeaveType
);

module.exports = router;
