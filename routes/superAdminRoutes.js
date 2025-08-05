const express = require("express");
const { createUser, updateUserRole, getAllUsers, deleteUser } = require("../controllers/superAdminController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");

const router = express.Router();

// Only Super Admin can manage users
router.post("/create-user", authenticateUser, authorizeRole(["superadmin"]), createUser);
router.put("/update-role", authenticateUser, authorizeRole(["superadmin"]), updateUserRole);
router.get("/users", authenticateUser, authorizeRole(["superadmin"]), getAllUsers);
router.delete("/delete/:userId", authenticateUser, authorizeRole(["superadmin"]), deleteUser); // ✅ New Delete Route

module.exports = router;
