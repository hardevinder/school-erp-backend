const { Concession } = require("../models");

// Create a new Concession
exports.createConcession = async (req, res) => {
  try {
    const { concession_name, concession_percentage, concession_remarks } = req.body;
    const concession = await Concession.create({ concession_name, concession_percentage, concession_remarks });
    res.status(201).json(concession);
  } catch (error) {
    res.status(500).json({ error: "Failed to create concession." });
  }
};

// Get all Concessions
exports.getAllConcessions = async (req, res) => {
  try {
    const concessions = await Concession.findAll();
    res.status(200).json(concessions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch concessions." });
  }
};

// Get a single Concession by ID
exports.getConcessionById = async (req, res) => {
  try {
    const concession = await Concession.findByPk(req.params.id);
    if (!concession) return res.status(404).json({ error: "Concession not found." });
    res.status(200).json(concession);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch concession." });
  }
};

// Update a Concession
exports.updateConcession = async (req, res) => {
  try {
    const { concession_name, concession_percentage, concession_remarks } = req.body;
    const concession = await Concession.findByPk(req.params.id);
    if (!concession) return res.status(404).json({ error: "Concession not found." });

    await concession.update({ concession_name, concession_percentage, concession_remarks });
    res.status(200).json(concession);
  } catch (error) {
    res.status(500).json({ error: "Failed to update concession." });
  }
};

// Delete a Concession
exports.deleteConcession = async (req, res) => {
  try {
    const concession = await Concession.findByPk(req.params.id);
    if (!concession) return res.status(404).json({ error: "Concession not found." });

    await concession.destroy();
    res.status(200).json({ message: "Concession deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete concession." });
  }
};
