const { AssessmentComponent } = require("../models");

// ==========================================================
// GET all components
// ==========================================================
exports.getAllComponents = async (req, res) => {
  try {
    const components = await AssessmentComponent.findAll({ order: [['id', 'ASC']] });
    res.json(components);
  } catch (err) {
    console.error("Error fetching components:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// ==========================================================
// CREATE a new component
// ==========================================================
exports.createComponent = async (req, res) => {
  try {
    const { name, abbreviation, max_marks, is_internal, is_practical } = req.body;

    if (!name || !abbreviation || !max_marks) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }

    const newComponent = await AssessmentComponent.create({
      name,
      abbreviation,
      max_marks,
      is_internal: is_internal ?? false,
      is_practical: is_practical ?? false,
    });

    res.status(201).json(newComponent);
  } catch (err) {
    console.error("Error creating component:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// ==========================================================
// UPDATE a component
// ==========================================================
exports.updateComponent = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, abbreviation, max_marks, is_internal, is_practical } = req.body;

    const component = await AssessmentComponent.findByPk(id);
    if (!component) {
      return res.status(404).json({ message: "Component not found." });
    }

    await component.update({
      name,
      abbreviation,
      max_marks,
      is_internal,
      is_practical,
    });

    res.json({ message: "Component updated successfully.", component });
  } catch (err) {
    console.error("Error updating component:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// ==========================================================
// DELETE a component
// ==========================================================
exports.deleteComponent = async (req, res) => {
  try {
    const id = req.params.id;
    const component = await AssessmentComponent.findByPk(id);
    if (!component) {
      return res.status(404).json({ message: "Component not found." });
    }

    await component.destroy();
    res.json({ message: "Component deleted successfully." });
  } catch (err) {
    console.error("Error deleting component:", err);
    res.status(500).json({ message: "Server Error" });
  }
};
