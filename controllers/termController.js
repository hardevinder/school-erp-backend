const { Term } = require("../models");

// 📥 Get all terms
exports.getAllTerms = async (req, res) => {
  try {
    const terms = await Term.findAll({ order: [["id", "ASC"]] });
    res.json(terms);
  } catch (err) {
    console.error("Error fetching terms:", err);
    res.status(500).json({ error: "Failed to fetch terms" });
  }
};

// ➕ Create a new term
// ➕ Create a new term
exports.createTerm = async (req, res) => {
  try {
    const { name, start_date, end_date, academic_year_id } = req.body;

    if (!name || !academic_year_id || !start_date || !end_date) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const newTerm = await Term.create({
      name,
      start_date,
      end_date,
      academic_year_id,
    });

    res.status(201).json(newTerm);
  } catch (err) {
    console.error("❌ Error creating term:", err);
    res.status(500).json({ error: "Failed to create term", details: err.message });
  }
};

// ✏️ Update a term
exports.updateTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_date, end_date } = req.body;

    const term = await Term.findByPk(id);
    if (!term) {
      return res.status(404).json({ error: "Term not found" });
    }

    term.name = name || term.name;
    term.start_date = start_date || null;
    term.end_date = end_date || null;

    await term.save();
    res.json(term);
  } catch (err) {
    console.error("Error updating term:", err);
    res.status(500).json({ error: "Failed to update term" });
  }
};

// ❌ Delete a term
exports.deleteTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const term = await Term.findByPk(id);
    if (!term) {
      return res.status(404).json({ error: "Term not found" });
    }

    await term.destroy();
    res.json({ message: "Term deleted successfully" });
  } catch (err) {
    console.error("Error deleting term:", err);
    res.status(500).json({ error: "Failed to delete term" });
  }
};
