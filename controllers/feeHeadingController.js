const { FeeHeading } = require('../models');

// Create a new Fee Heading
exports.createFeeHeading = async (req, res) => {
  try {
    const { fee_heading, fee_category_id } = req.body;

    // Validate inputs
    if (!fee_heading || typeof fee_heading !== 'string') {
      return res.status(400).json({ error: 'Fee heading is required and must be a valid string.' });
    }
    if (!fee_category_id || isNaN(fee_category_id)) {
      return res.status(400).json({ error: 'Fee category id is required and must be a valid number.' });
    }

    const newFeeHeading = await FeeHeading.create({ fee_heading, fee_category_id });
    res.status(201).json(newFeeHeading);
  } catch (error) {
    console.error('Error creating fee heading:', error);
    res.status(500).json({ error: 'Failed to create fee heading.' });
  }
};

// Get all Fee Headings (including associated Fee Category)
exports.getFeeHeadings = async (req, res) => {
  try {
    const feeHeadings = await FeeHeading.findAll({
      include: ['FeeCategory'] // Ensure this alias matches your association in the FeeHeading model
    });

    if (!feeHeadings.length) {
      return res.status(404).json({ message: 'No fee headings found.' });
    }

    res.status(200).json(feeHeadings);
  } catch (error) {
    console.error('Error fetching fee headings:', error);
    res.status(500).json({ error: 'Failed to fetch fee headings.' });
  }
};

// Update a Fee Heading
exports.updateFeeHeading = async (req, res) => {
  try {
    const { id } = req.params;
    const { fee_heading, fee_category_id } = req.body;

    // Validate inputs
    if (!fee_heading || typeof fee_heading !== 'string') {
      return res.status(400).json({ error: 'Fee heading is required and must be a valid string.' });
    }
    if (!fee_category_id || isNaN(fee_category_id)) {
      return res.status(400).json({ error: 'Fee category id is required and must be a valid number.' });
    }

    // Check if FeeHeading exists
    const existingFeeHeading = await FeeHeading.findByPk(id);
    if (!existingFeeHeading) {
      return res.status(404).json({ error: 'Fee heading not found.' });
    }

    await FeeHeading.update(
      { fee_heading, fee_category_id },
      { where: { id } }
    );
    res.status(200).json({ message: 'Fee heading updated successfully.' });
  } catch (error) {
    console.error('Error updating fee heading:', error);
    res.status(500).json({ error: 'Failed to update fee heading.' });
  }
};

// Delete a Fee Heading
exports.deleteFeeHeading = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if FeeHeading exists
    const existingFeeHeading = await FeeHeading.findByPk(id);
    if (!existingFeeHeading) {
      return res.status(404).json({ error: 'Fee heading not found.' });
    }

    await FeeHeading.destroy({ where: { id } });
    res.status(200).json({ message: 'Fee heading deleted.' });
  } catch (error) {
    console.error('Error deleting fee heading:', error);
    res.status(500).json({ error: 'Failed to delete fee heading.' });
  }
};
