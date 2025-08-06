const express = require("express");
const router = express.Router();
const controller = require("../controllers/reportCardFormatController");
const { authenticateUser, authorizeRole } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

// ✅ Create new format (Academic Coordinators, Admin, or Superadmin allowed)
router.post(
  "/",
  authenticateUser,
  authorizeRole(["academic_coordinator", "admin", "superadmin"]),
  controller.createFormat
);

// ✅ Update existing format (Academic Coordinators, Admin, or Superadmin allowed)
router.put(
  "/:id",
  authenticateUser,
  authorizeRole(["academic_coordinator", "admin", "superadmin"]),
  controller.updateFormat
);

// ✅ Delete format (Academic Coordinators, Admin, or Superadmin allowed)
router.delete(
  "/:id",
  authenticateUser,
  authorizeRole(["academic_coordinator", "admin", "superadmin"]),
  controller.deleteFormat
);

// ✅ Get all formats — 📢 OPEN TO ALL (no auth)
router.get("/", controller.getAllFormats);

// ✅ Get format by class — 📢 OPEN TO ALL (no auth)
router.get("/by-class", controller.getFormatByClass);

// ✅ Get assigned classes for report card access (Coordinator, Teacher, Admin, Superadmin)
router.get(
  "/assigned-classes",
  authenticateUser,
  authorizeRole(["academic_coordinator", "teacher", "admin", "superadmin"]),
  controller.getAssignedClasses
);

// ✅ Upload school/board logo (image/pdf/excel) — Admin/Coordinator only
router.post(
  "/upload-logo",
  authenticateUser,
  authorizeRole(["academic_coordinator", "admin", "superadmin"]),
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.status(200).json({ url: fileUrl });
  }
);



module.exports = router;
