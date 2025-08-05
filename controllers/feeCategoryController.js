// controllers/feeCategoryController.js
const db = require('../models'); // Ensure this loads your models/index.js that sets up Sequelize.
const FeeCategory = db.FeeCategory;

// Get all fee categories
exports.getAllFeeCategories = async (req, res) => {
  try {
    const feeCategories = await FeeCategory.findAll();
    res.status(200).json(feeCategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single fee category by ID
exports.getFeeCategoryById = async (req, res) => {
  try {
    const id = req.params.id;
    const feeCategory = await FeeCategory.findByPk(id);

    if (!feeCategory) {
      return res.status(404).json({ message: 'Fee category not found' });
    }

    res.status(200).json(feeCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new fee category
exports.createFeeCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Basic validation (adjust as needed)
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const newFeeCategory = await FeeCategory.create({
      name,
      description,
    });

    res.status(201).json(newFeeCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update an existing fee category
exports.updateFeeCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, description } = req.body;

    const feeCategory = await FeeCategory.findByPk(id);

    if (!feeCategory) {
      return res.status(404).json({ message: 'Fee category not found' });
    }

    feeCategory.name = name || feeCategory.name;
    feeCategory.description = description !== undefined ? description : feeCategory.description;

    await feeCategory.save();

    res.status(200).json(feeCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a fee category
exports.deleteFeeCategory = async (req, res) => {
  try {
    const id = req.params.id;

    const feeCategory = await FeeCategory.findByPk(id);

    if (!feeCategory) {
      return res.status(404).json({ message: 'Fee category not found' });
    }

    await feeCategory.destroy();

    res.status(200).json({ message: 'Fee category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
