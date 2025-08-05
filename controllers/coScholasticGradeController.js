const { CoScholasticGrade } = require("../models");

// ✅ Get all grades (optionally filter active)
exports.getGrades = async (req, res) => {
  try {
    const { active } = req.query;
    const where = {};

    if (active === "true") where.is_active = true;
    if (active === "false") where.is_active = false;

    const grades = await CoScholasticGrade.findAll({
      where,
      order: [["order", "ASC"]],
    });

    res.json(grades);
  } catch (err) {
    console.error("Error fetching grades:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Create new grade
exports.createGrade = async (req, res) => {
  try {
    const { grade, description, order, is_active } = req.body;

    if (!grade) return res.status(400).json({ message: "Grade is required" });

    const newGrade = await CoScholasticGrade.create({
      grade,
      description,
      order: order || 0,
      is_active: is_active !== undefined ? is_active : true,
    });

    res.status(201).json(newGrade);
  } catch (err) {
    console.error("Error creating grade:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Update grade
exports.updateGrade = async (req, res) => {
  try {
    const { id } = req.params;
    const { grade, description, order, is_active } = req.body;

    const existing = await CoScholasticGrade.findByPk(id);
    if (!existing) return res.status(404).json({ message: "Grade not found" });

    existing.grade = grade || existing.grade;
    existing.description = description || existing.description;
    existing.order = order !== undefined ? order : existing.order;
    existing.is_active = is_active !== undefined ? is_active : existing.is_active;

    await existing.save();

    res.json(existing);
  } catch (err) {
    console.error("Error updating grade:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Delete grade
exports.deleteGrade = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await CoScholasticGrade.findByPk(id);
    if (!existing) return res.status(404).json({ message: "Grade not found" });

    await existing.destroy();
    res.json({ message: "Grade deleted successfully" });
  } catch (err) {
    console.error("Error deleting grade:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
