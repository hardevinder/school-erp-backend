const express = require("express");
const router = express.Router();
const transportationController = require("../controllers/transportationController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware"); // Import middleware

// Protect all transportation routes – Only Admin & Super Admin can access
router.post("/", authenticateUser, authorizeRole(["admin", "superadmin"]), transportationController.createTransportation);
router.get("/", authenticateUser, authorizeRole(["admin", "superadmin"]), transportationController.getAllTransportation);
router.get("/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), transportationController.getTransportationById);
router.put("/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), transportationController.updateTransportation);
router.delete("/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), transportationController.deleteTransportation);

module.exports = router;
