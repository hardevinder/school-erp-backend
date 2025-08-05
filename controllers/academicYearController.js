const { AcademicYear } = require("../models");

// 📥 Get all academic years
exports.getAllAcademicYears = async (req, res) => {
  try {
    const years = await AcademicYear.findAll({ order: [["start_date", "DESC"]] });
    res.json(years);
  } catch (err) {
    console.error("Error fetching academic years:", err);
    res.status(500).json({ error: "Failed to fetch academic years" });
  }
};

// ➕ Create a new academic year
exports.createAcademicYear = async (req, res) => {
  try {
    const { name, start_date, end_date } = req.body;

    if (!name || !start_date || !end_date) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const newYear = await AcademicYear.create({ name, start_date, end_date });
    res.status(201).json(newYear);
  } catch (err) {
    console.error("Error creating academic year:", err);
    res.status(500).json({ error: "Failed to create academic year" });
  }
};

// ✏️ Update academic year
exports.updateAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_date, end_date } = req.body;

    const year = await AcademicYear.findByPk(id);
    if (!year) {
      return res.status(404).json({ error: "Academic year not found" });
    }

    year.name = name || year.name;
    year.start_date = start_date || year.start_date;
    year.end_date = end_date || year.end_date;

    await year.save();
    res.json(year);
  } catch (err) {
    console.error("Error updating academic year:", err);
    res.status(500).json({ error: "Failed to update academic year" });
  }
};

// ❌ Delete academic year
exports.deleteAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;

    const year = await AcademicYear.findByPk(id);
    if (!year) {
      return res.status(404).json({ error: "Academic year not found" });
    }

    await year.destroy();
    res.json({ message: "Academic year deleted successfully" });
  } catch (err) {
    console.error("Error deleting academic year:", err);
    res.status(500).json({ error: "Failed to delete academic year" });
  }
};
