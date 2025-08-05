const express = require("express");
const router = express.Router();
const routesController = require("../controllers/routesController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware"); // Import middleware

// Protect all routes – Only Admin & Super Admin can access
router.post("/routes", authenticateUser, authorizeRole(["admin", "superadmin"]), routesController.createRoute);
router.get("/routes", authenticateUser, authorizeRole(["admin", "superadmin"]), routesController.getAllRoutes);
router.get("/routes/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), routesController.getRouteById);
router.put("/routes/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), routesController.updateRoute);
router.delete("/routes/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), routesController.deleteRoute);

module.exports = router;
