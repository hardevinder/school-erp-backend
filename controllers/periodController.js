const { Period } = require('../models');

// Create a new period
exports.createPeriod = async (req, res) => {
  try {
    const { period_name, start_time, end_time } = req.body;
    // Directly use the provided time strings
    const period = await Period.create({ 
      period_name, 
      start_time, 
      end_time 
    });
    return res.status(201).json(period);
  } catch (error) {
    console.error('Error creating period:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Get all periods
exports.getAllPeriods = async (req, res) => {
  try {
    const periods = await Period.findAll();
    return res.status(200).json(periods);
  } catch (error) {
    console.error('Error retrieving periods:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Get a single period by ID
exports.getPeriodById = async (req, res) => {
  try {
    const { id } = req.params;
    const period = await Period.findByPk(id);
    if (!period) {
      return res.status(404).json({ error: 'Period not found' });
    }
    return res.status(200).json(period);
  } catch (error) {
    console.error('Error retrieving period:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Update a period by ID
exports.updatePeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const { period_name, start_time, end_time } = req.body;
    
    const period = await Period.findByPk(id);
    if (!period) {
      return res.status(404).json({ error: 'Period not found' });
    }
    
    await period.update({ period_name, start_time, end_time });
    return res.status(200).json(period);
  } catch (error) {
    console.error('Error updating period:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Delete a period by ID
exports.deletePeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const period = await Period.findByPk(id);
    if (!period) {
      return res.status(404).json({ error: 'Period not found' });
    }
    
    await period.destroy();
    return res.status(200).json({ message: 'Period deleted successfully' });
  } catch (error) {
    console.error('Error deleting period:', error);
    return res.status(500).json({ error: error.message });
  }
};
