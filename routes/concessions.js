const express = require("express");
const router = express.Router();
const concessionController = require("../controllers/concessionController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

// Protect all concession routes – Only Admin & Super Admin can access
router.post("/", authenticateUser, authorizeRole(["admin", "superadmin"]), concessionController.createConcession);
router.get("/", authenticateUser, authorizeRole(["admin", "superadmin"]), concessionController.getAllConcessions);
router.get("/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), concessionController.getConcessionById);
router.put("/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), concessionController.updateConcession);
router.delete("/:id", authenticateUser, authorizeRole(["admin", "superadmin"]), concessionController.deleteConcession);

module.exports = router;
