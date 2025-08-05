const express = require("express");
const {
  registerUser,
  loginUser,
  saveToken,
  editUserProfile,
  getUserProfile,
  getStudents,
  updateUserAndRoles,
  listUsers,
  deleteUser,
  disableUser,
  enableUser,
  getEmployeeUsers, 
} = require("../controllers/UserController");


const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

const router = express.Router();

/**
 * Admin / Superadmin / Academic Coordinator
 * ➤ Academic Coordinator can only register/update student users (enforced in controller)
 */
router.post(
  "/register",
  authenticateUser,
  authorizeRole(["admin", "superadmin", "academic_coordinator", "hr"]),
  registerUser
);

router.put(
  "/:id", // 🆕 RESTful route
  authenticateUser,
  authorizeRole(["admin", "superadmin", "hr"]), // Coordinator cannot update employees
  updateUserAndRoles
);


router.put(
  "/update",
  authenticateUser,
  authorizeRole(["admin", "superadmin", "academic_coordinator"]),
  updateUserAndRoles
);

router.get(
  "/all",
  authenticateUser,
  authorizeRole(["admin", "superadmin"]),
  listUsers
);

// 🟡 Disable user - Admin, Superadmin, Academic Coordinator (student only)
router.put(
  "/:id/disable",
  authenticateUser,
  authorizeRole(["admin", "superadmin", "academic_coordinator"]),
  disableUser
);

// 🟢 Enable user - Admin, Superadmin, Academic Coordinator (student only)
router.put(
  "/:id/enable",
  authenticateUser,
  authorizeRole(["admin", "superadmin", "academic_coordinator"]),
  enableUser
);

// 🔴 Delete user - Only Superadmin
router.delete(
  "/:id",
  authenticateUser,
  authorizeRole(["superadmin"]),
  deleteUser
);

/**
 * Auth endpoints
 */
router.post("/login", loginUser);

/**
 * Optional: protect token save (recommended)
 */
router.post("/save-token", authenticateUser, saveToken);

/**
 * Self-service profile
 */
router.put("/edit-profile", authenticateUser, upload.single("profilePhoto"), editUserProfile);
router.get("/profile", authenticateUser, getUserProfile);

/**
 * Students list (admin/teacher/academic_coordinator/superadmin)
 */
router.get(
  "/students",
  authenticateUser,
  authorizeRole(["admin", "teacher", "academic_coordinator", "superadmin"]),
  getStudents
);



// HR/Admin/Superadmin: Fetch registered employee user accounts
router.get(
  "/employees",
  authenticateUser,
  authorizeRole(["admin", "superadmin", "hr"]),
  getEmployeeUsers
);


module.exports = router;



