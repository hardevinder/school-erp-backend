const { CoScholasticArea } = require("../models");

// ✅ GET all areas (with optional is_active filter)
exports.getAreas = async (req, res) => {
  try {
    const { active } = req.query;
    const where = {};

    if (active === "true") where.is_active = true;
    if (active === "false") where.is_active = false;

    const areas = await CoScholasticArea.findAll({ where, order: [['id', 'ASC']] });
    res.json(areas);
  } catch (error) {
    console.error("Error fetching Co-Scholastic Areas:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ CREATE new area
exports.createArea = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) return res.status(400).json({ message: "Name is required" });

    const newArea = await CoScholasticArea.create({ name, description });
    res.status(201).json(newArea);
  } catch (error) {
    console.error("Error creating Co-Scholastic Area:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ UPDATE area
exports.updateArea = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    const area = await CoScholasticArea.findByPk(id);
    if (!area) return res.status(404).json({ message: "Area not found" });

    area.name = name || area.name;
    area.description = description || area.description;
    if (is_active !== undefined) area.is_active = is_active;

    await area.save();
    res.json(area);
  } catch (error) {
    console.error("Error updating Co-Scholastic Area:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ DELETE area
exports.deleteArea = async (req, res) => {
  try {
    const { id } = req.params;

    const area = await CoScholasticArea.findByPk(id);
    if (!area) return res.status(404).json({ message: "Area not found" });

    await area.destroy();
    res.json({ message: "Area deleted successfully" });
  } catch (error) {
    console.error("Error deleting Co-Scholastic Area:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
