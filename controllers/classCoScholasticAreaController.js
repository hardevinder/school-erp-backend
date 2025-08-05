const { ClassCoScholasticArea, Class, CoScholasticArea, Term } = require("../models");

// ✅ Create Mapping
exports.createMapping = async (req, res) => {
  try {
    const { class_id, area_id, term_id } = req.body;

    const existing = await ClassCoScholasticArea.findOne({
      where: { class_id, area_id, term_id },
    });

    if (existing) {
      return res.status(400).json({ message: "Mapping already exists." });
    }

    const newMapping = await ClassCoScholasticArea.create({ class_id, area_id, term_id });
    res.status(201).json(newMapping);
  } catch (err) {
    console.error("Error creating mapping:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ Get All Mappings
exports.getAllMappings = async (req, res) => {
  try {
    const mappings = await ClassCoScholasticArea.findAll({
      include: [
        { model: Class, as: "class", attributes: ["id", "class_name"] },
        { model: CoScholasticArea, as: "area", attributes: ["id", "name"] },
        { model: Term, as: "term", attributes: ["id", "name"] },
      ],
      order: [["class_id", "ASC"]],
    });
    res.json(mappings);
  } catch (err) {
    console.error("Error fetching mappings:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ Update Mapping
exports.updateMapping = async (req, res) => {
  try {
    const id = req.params.id;
    const { class_id, area_id, term_id } = req.body;

    const mapping = await ClassCoScholasticArea.findByPk(id);
    if (!mapping) return res.status(404).json({ message: "Mapping not found." });

    await mapping.update({ class_id, area_id, term_id });
    res.json(mapping);
  } catch (err) {
    console.error("Error updating mapping:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ Delete Mapping
exports.deleteMapping = async (req, res) => {
  try {
    const id = req.params.id;

    const mapping = await ClassCoScholasticArea.findByPk(id);
    if (!mapping) return res.status(404).json({ message: "Mapping not found." });

    await mapping.destroy();
    res.json({ message: "Mapping deleted successfully." });
  } catch (err) {
    console.error("Error deleting mapping:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};
