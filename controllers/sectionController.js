const { Section } = require("../models"); // Import the Section model

// Create a Section
exports.createSection = async (req, res) => {
  try {
    const { section_name } = req.body;

    if (!section_name) {
      return res.status(400).json({ error: "Section name is required" });
    }

    const newSection = await Section.create({ section_name });
    res.status(201).json(newSection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all Sections
exports.getAllSections = async (req, res) => {
  try {
    const sections = await Section.findAll();
    res.status(200).json(sections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a Section by ID
exports.getSectionById = async (req, res) => {
  try {
    const { id } = req.params;
    const section = await Section.findByPk(id);

    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }

    res.status(200).json(section);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a Section
exports.updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { section_name } = req.body;

    const section = await Section.findByPk(id);

    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }

    section.section_name = section_name;
    await section.save();

    res.status(200).json(section);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a Section
exports.deleteSection = async (req, res) => {
  try {
    const { id } = req.params;

    const section = await Section.findByPk(id);

    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }

    await section.destroy();

    res.status(200).json({ message: "Section deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
