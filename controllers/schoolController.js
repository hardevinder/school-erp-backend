const { School } = require('../models');

// Create a new school record
exports.createSchool = async (req, res) => {
  try {
    const { name, description, phone, email, logo } = req.body;

    const newSchool = await School.create({
      name,
      description,
      phone,
      email,
      logo
    });

    res.status(201).json({ message: "School created successfully", school: newSchool });
  } catch (error) {
    res.status(500).json({ message: "Error creating school", error: error.message });
  }
};

// Get all school records
exports.getAllSchools = async (req, res) => {
  try {
    const schools = await School.findAll();
    res.status(200).json(schools);
  } catch (error) {
    res.status(500).json({ message: "Error fetching schools", error: error.message });
  }
};

// Get a single school record by ID
exports.getSchoolById = async (req, res) => {
  try {
    const { id } = req.params;
    const school = await School.findByPk(id);

    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    res.status(200).json(school);
  } catch (error) {
    res.status(500).json({ message: "Error fetching school", error: error.message });
  }
};

// Update a school record
exports.updateSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, phone, email, logo } = req.body;

    const school = await School.findByPk(id);

    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    await school.update({ name, description, phone, email, logo });

    res.status(200).json({ message: "School updated successfully", school });
  } catch (error) {
    res.status(500).json({ message: "Error updating school", error: error.message });
  }
};

// Delete a school record
exports.deleteSchool = async (req, res) => {
  try {
    const { id } = req.params;
    
    const school = await School.findByPk(id);

    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    await school.destroy();

    res.status(200).json({ message: "School deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting school", error: error.message });
  }
};
