// controllers/transportationController.js
const { Transportation } = require("../models");

// ✅ Create Transportation with Fine Fields
exports.createTransportation = async (req, res) => {
  try {
    const { RouteName, Villages, Cost, finePercentage, fineStartDate } = req.body;

    const transportation = await Transportation.create({
      RouteName,
      Villages,
      Cost,
      finePercentage: finePercentage || 0, // Default to 0 if not provided
      fineStartDate: fineStartDate || null, // Default to null if not provided
    });

    res.status(201).json(transportation);
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Database error:", error);
    res.status(500).json({ error: "Failed to create transportation" });
  }
};

// ✅ Get all Transportation records (Includes Fine Fields)
exports.getAllTransportation = async (req, res) => {
  try {
    const transportation = await Transportation.findAll();
    res.status(200).json(transportation);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve transportation" });
  }
};

// ✅ Get a single Transportation record
exports.getTransportationById = async (req, res) => {
  try {
    const { id } = req.params;
    const transportation = await Transportation.findByPk(id);
    if (!transportation) {
      return res.status(404).json({ error: "Transportation not found" });
    }
    res.status(200).json(transportation);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve transportation" });
  }
};

// ✅ Update a Transportation record (Includes Fine Fields)
exports.updateTransportation = async (req, res) => {
  try {
    const { id } = req.params;
    const { RouteName, Villages, Cost, finePercentage, fineStartDate } = req.body;

    const transportation = await Transportation.findByPk(id);
    if (!transportation) {
      return res.status(404).json({ error: "Transportation not found" });
    }

    // Update fields
    transportation.RouteName = RouteName;
    transportation.Villages = Villages;
    transportation.Cost = Cost;
    transportation.finePercentage = finePercentage !== undefined ? finePercentage : transportation.finePercentage;
    transportation.fineStartDate = fineStartDate !== undefined ? fineStartDate : transportation.fineStartDate;

    await transportation.save();
    res.status(200).json(transportation);
  } catch (error) {
    res.status(500).json({ error: "Failed to update transportation" });
  }
};

// ✅ Delete a Transportation record
exports.deleteTransportation = async (req, res) => {
  try {
    const { id } = req.params;
    const transportation = await Transportation.findByPk(id);
    if (!transportation) {
      return res.status(404).json({ error: "Transportation not found" });
    }

    await transportation.destroy();
    res.status(200).json({ message: "Transportation deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete transportation" });
  }


  // ✅ Get Transportation Fee Receipt by Slip_ID
exports.getTransportationBySlipID = async (req, res) => {
  try {
    const { slipId } = req.params;
    const transportation = await Transportation.findOne({ where: { Slip_ID: slipId } });

    if (!transportation) {
      return res.status(404).json({ error: "Transportation record not found" });
    }

    res.status(200).json(transportation);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve transportation receipt" });
  }
}

};
