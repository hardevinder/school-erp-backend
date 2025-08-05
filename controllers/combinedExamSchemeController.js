const { CombinedExamScheme, Class, Subject, Exam } = require("../models");

// GET all schemes (with optional class_id, subject_id filter)
exports.getCombinedSchemes = async (req, res) => {
  try {
    const { class_id, subject_id } = req.query;

    const where = {};
    if (class_id) where.class_id = class_id;
    if (subject_id) where.subject_id = subject_id;

    const schemes = await CombinedExamScheme.findAll({
      where,
      include: [
        { model: Class, as: "class", attributes: ["id", "class_name"] },
        { model: Subject, as: "subject", attributes: ["id", "name"] },
        { model: Exam, as: "exam", attributes: ["id", "name"] },
      ],
      order: [["subject_id", "ASC"]],
    });

    res.json(schemes);
  } catch (err) {
    console.error("Error fetching combined exam schemes:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// CREATE new scheme
exports.createCombinedScheme = async (req, res) => {
  try {
    const { class_id, subject_id, exam_id, weightage_percent } = req.body;

    if (!class_id || !subject_id || !exam_id || weightage_percent == null) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const scheme = await CombinedExamScheme.create({
      class_id,
      subject_id,
      exam_id,
      weightage_percent,
    });

    res.status(201).json(scheme);
  } catch (err) {
    console.error("Error creating scheme:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE scheme
exports.updateCombinedScheme = async (req, res) => {
  try {
    const { id } = req.params;
    const { weightage_percent } = req.body;

    const scheme = await CombinedExamScheme.findByPk(id);
    if (!scheme) return res.status(404).json({ message: "Scheme not found" });

    scheme.weightage_percent = weightage_percent;
    await scheme.save();

    res.json(scheme);
  } catch (err) {
    console.error("Error updating scheme:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE scheme
exports.deleteCombinedScheme = async (req, res) => {
  try {
    const { id } = req.params;

    const scheme = await CombinedExamScheme.findByPk(id);
    if (!scheme) return res.status(404).json({ message: "Scheme not found" });

    await scheme.destroy();
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Error deleting scheme:", err);
    res.status(500).json({ message: "Server error" });
  }
};
