const express = require("express");
const router = express.Router();
const academicYearController = require("../controllers/academicYearController");

// 📥 Get all academic years
router.get("/", academicYearController.getAllAcademicYears);

// ➕ Create a new academic year
router.post("/", academicYearController.createAcademicYear);

// ✏️ Update an academic year
router.put("/:id", academicYearController.updateAcademicYear);

// ❌ Delete an academic year
router.delete("/:id", academicYearController.deleteAcademicYear);

module.exports = router;
