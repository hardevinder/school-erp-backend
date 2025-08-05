const dayjs = require('dayjs');
const { FeeStructure, Class, FeeHeading } = require("../models");

// Debug log to check if the FeeStructure model is properly imported
console.log("FeeStructure Model:", FeeStructure);

/**
 * Get all fee records with pagination, sorting, and associations
 */

function calculateFine(fee) {
  const today = dayjs();
  const fineStartDate = fee.fineStartDate ? dayjs(fee.fineStartDate) : null;

  if (!fineStartDate || today.isBefore(fineStartDate)) return 0;

  const due = Number(fee.feeDue || 0);

  if (fee.fineType === "percentage") {
    const percent = Number(fee.finePercentage || 0);
    return Math.ceil((percent / 100) * due);
  } else if (fee.fineType === "fixed") {
    const perSlab = Number(fee.fineAmountPerSlab || 0);
    const slabDays = Number(fee.fineSlabDuration || 0);
    const daysLate = today.diff(fineStartDate, "day");
    const slabs = Math.floor(daysLate / slabDays);
    return perSlab * slabs;
  }

  return 0;
}

exports.getAllFees = async (req, res) => {
  try {
    console.log("Fetching all fees with pagination...");
    const { page = 1, limit = 500 } = req.query;
    const offset = (page - 1) * parseInt(limit, 10);

    const { count, rows: fees } = await FeeStructure.findAndCountAll({
      offset,
      limit: parseInt(limit, 10),
      order: [["id", "ASC"]],
      attributes: [
        "id",
        "class_id",
        "fee_heading_id",
        "feeDue",
        "admissionType",
        "finePercentage",
        "fineStartDate",
        "fineType",
        "fineAmountPerSlab",
        "fineSlabDuration",
        "concessionApplicable",
        "transportApplicable",
      ],
      include: [
        {
          model: Class,
          as: "Class",
          attributes: ["id", "class_name"],
        },
        {
          model: FeeHeading,
          as: "FeeHeading",
          attributes: ["id", "fee_heading"],
        },
      ],
    });

    // Fine Calculation Logic
    const calculateFine = (fee) => {
      if (!fee.fineStartDate) return 0;

      const today = new Date();
      const startDate = new Date(fee.fineStartDate);
      if (today <= startDate) return 0;

      const daysLate = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

      if (fee.fineType === "slab") {
        const slabDuration = parseInt(fee.fineSlabDuration || 0);
        const fineAmount = parseFloat(fee.fineAmountPerSlab || 0);
        const slabCount = Math.floor(daysLate / slabDuration);
        const totalFine = slabCount * fineAmount;

        console.log(`Slab fine → Days Late: ${daysLate}, Slabs: ${slabCount}, Fine per slab: ₹${fineAmount}, Total Fine: ₹${totalFine}`);
        return totalFine;
      } else if (fee.fineType === "percentage") {
        const finePercentage = parseFloat(fee.finePercentage || 0);
        const fine = (parseFloat(fee.feeDue || 0) * finePercentage) / 100;

        console.log(`Percentage fine → ₹${fee.feeDue} × ${finePercentage}% = ₹${fine}`);
        return fine;
      }

      return 0;
    };

    const enrichedFees = fees.map((fee) => ({
      ...fee.toJSON(),
      calculatedFine: calculateFine(fee),
    }));

    res.status(200).json({ total: count, fees: enrichedFees });
  } catch (error) {
    console.error("Error in getAllFees:", error);
    res.status(500).json({
      error: "Failed to fetch fee records",
      details: error.message,
    });
  }
};


/**
 * Get a single fee record by ID with associations
 */
exports.getFeeById = async (req, res) => {
  try {
    console.log(`Fetching fee record with ID: ${req.params.id}`);

    const fee = await FeeStructure.findByPk(req.params.id, {
      attributes: [
        "id",
        "class_id",
        "fee_heading_id",
        "feeDue",
        "admissionType",
        "finePercentage",
        "fineStartDate",
        "fineType",            // new
        "fineAmountPerSlab",   // new
        "fineSlabDuration",    // new
        "concessionApplicable",
        "transportApplicable",
      ],
      include: [
        {
          model: Class,
          as: "Class",
          attributes: ["id", "class_name"],
        },
        {
          model: FeeHeading,
          as: "FeeHeading",
          attributes: ["id", "fee_heading"],
        },
      ],
    });

    if (!fee) {
      console.warn("Fee record not found for ID:", req.params.id);
      return res.status(404).json({ error: "Fee record not found" });
    }

    console.log("Fee record fetched successfully:", fee);
    res.status(200).json(fee);
  } catch (error) {
    console.error("Error in getFeeById:", error);
    res.status(500).json({
      error: "Failed to fetch the fee record",
      details: error.message,
    });
  }
};

/**
 * Get fee records by class_id
 */
exports.getFeesByClassId = async (req, res) => {
  try {
    const { class_id } = req.params;
    console.log(`Fetching fees for class_id: ${class_id}`);

    if (!class_id) {
      return res.status(400).json({ error: "class_id is required" });
    }

    const fees = await FeeStructure.findAll({
      where: { class_id },
      attributes: [
        "id",
        "class_id",
        "fee_heading_id",
        "feeDue",
        "admissionType",
        "finePercentage",
        "fineStartDate",
        "fineType",            // new
        "fineAmountPerSlab",   // new
        "fineSlabDuration",    // new
        "concessionApplicable",
        "transportApplicable",
      ],
      include: [
        {
          model: Class,
          as: "Class",
          attributes: ["id", "class_name"],
        },
        {
          model: FeeHeading,
          as: "FeeHeading",
          attributes: ["id", "fee_heading"],
        },
      ],
    });

    if (fees.length === 0) {
      console.warn(`No fee records found for class_id: ${class_id}`);
      return res.status(404).json({
        error: "No fee records found for the specified class_id",
      });
    }

    console.log(`Fee records fetched successfully for class_id: ${class_id}`);
    res.status(200).json(fees);
  } catch (error) {
    console.error("Error in getFeesByClassId:", error);
    res.status(500).json({
      error: "Failed to fetch fee records by class_id",
      details: error.message,
    });
  }
};

/**
 * Create a new fee record with validation
 */
exports.createFee = async (req, res) => {
  try {
    console.log("Creating a new fee record...");
    console.log("Request body:", req.body);

    const {
      class_id,
      fee_heading_id,
      feeDue,
      admissionType,
      finePercentage,
      fineStartDate,
      fineType,            // new
      fineAmountPerSlab,   // new
      fineSlabDuration,    // new
      concessionApplicable,
      transportApplicable,
    } = req.body;

    if (!class_id || !fee_heading_id || !feeDue || !admissionType) {
      console.warn("Validation failed. Missing fields:", req.body);
      return res.status(400).json({ error: "All required fields are missing" });
    }

    const newFee = await FeeStructure.create({
      class_id,
      fee_heading_id,
      feeDue,
      admissionType,
      finePercentage: finePercentage || 0,
      fineStartDate: fineStartDate || null,
      fineType: fineType || "percentage",
      fineAmountPerSlab: fineAmountPerSlab || null,
      fineSlabDuration: fineSlabDuration || null,
      concessionApplicable: concessionApplicable || "No",
      transportApplicable: transportApplicable || "No",
    });

    console.log("New fee record created successfully:", newFee);
    res.status(201).json(newFee);
  } catch (error) {
    console.error("Error in createFee:", error);
    res.status(400).json({
      error: "Failed to create fee record",
      details: error.message,
    });
  }
};

/**
 * Update an existing fee record
 */
exports.updateFee = async (req, res) => {
  try {
    console.log(`Updating fee record with ID: ${req.params.id}`);
    console.log("Request body:", req.body);

    const {
      class_id,
      fee_heading_id,
      feeDue,
      admissionType,
      finePercentage,
      fineStartDate,
      fineType,            // new
      fineAmountPerSlab,   // new
      fineSlabDuration,    // new
      concessionApplicable,
      transportApplicable,
    } = req.body;

    const fee = await FeeStructure.findByPk(req.params.id);
    if (!fee) {
      console.warn("Fee record not found for ID:", req.params.id);
      return res.status(404).json({ error: "Fee record not found" });
    }

    await fee.update({
      class_id,
      fee_heading_id,
      feeDue,
      admissionType,
      finePercentage,
      fineStartDate,
      fineType,
      fineAmountPerSlab,
      fineSlabDuration,
      concessionApplicable,
      transportApplicable,
    });

    console.log("Fee record updated successfully:", fee);
    res.status(200).json(fee);
  } catch (error) {
    console.error("Error in updateFee:", error);
    res.status(400).json({
      error: "Failed to update fee record",
      details: error.message,
    });
  }
};

/**
 * Delete a fee record (soft delete is recommended, if applicable)
 */
exports.deleteFee = async (req, res) => {
  try {
    console.log(`Deleting fee record with ID: ${req.params.id}`);
    const fee = await FeeStructure.findByPk(req.params.id);

    if (!fee) {
      console.warn("Fee record not found for ID:", req.params.id);
      return res.status(404).json({ error: "Fee record not found" });
    }

    await fee.destroy();
    console.log("Fee record deleted successfully with ID:", req.params.id);
    res.status(200).json({ message: "Fee record deleted successfully" });
  } catch (error) {
    console.error("Error in deleteFee:", error);
    res.status(500).json({
      error: "Failed to delete fee record",
      details: error.message,
    });
  }
};
