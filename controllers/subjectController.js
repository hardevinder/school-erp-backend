const { Subject } = require("../models"); // ✅ Fix import

// ✅ Create a new subject
const createSubject = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Subject name is required" });
    }

    const newSubject = await Subject.create({ name, description });
    res.status(201).json({ message: "Subject created successfully", subject: newSubject });
  } catch (error) {
    console.error("Error creating subject:", error);
    res.status(500).json({ error: "Failed to create subject", details: error.message });
  }
};

// ✅ Retrieve all subjects
const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.findAll();
    res.status(200).json({ message: "Subjects fetched successfully", subjects });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ error: "Failed to fetch subjects", details: error.message });
  }
};

// ✅ Retrieve a single subject by ID
const getSubjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findByPk(id);

    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }

    res.status(200).json({ message: "Subject found", subject });
  } catch (error) {
    console.error("Error fetching subject:", error);
    res.status(500).json({ error: "Failed to fetch subject", details: error.message });
  }
};

// ✅ Update an existing subject
const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const subject = await Subject.findByPk(id);
    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }

    subject.name = name || subject.name;
    subject.description = description || subject.description;
    await subject.save();

    res.status(200).json({ message: "Subject updated successfully", subject });
  } catch (error) {
    console.error("Error updating subject:", error);
    res.status(500).json({ error: "Failed to update subject", details: error.message });
  }
};

// ✅ Delete a subject
const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findByPk(id);
    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }

    await subject.destroy();
    res.status(200).json({ message: "Subject deleted successfully" });
  } catch (error) {
    console.error("Error deleting subject:", error);
    res.status(500).json({ error: "Failed to delete subject", details: error.message });
  }
};

module.exports = {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
};
