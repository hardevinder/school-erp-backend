const { Department } = require("../models");
const { Op } = require("sequelize");

/* =========================================================
   GET ALL DEPARTMENTS (Active Only)
========================================================= */
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      order: [["id", "ASC"]],
    });
    res.json({ departments });
  } catch (error) {
    console.error("GET /departments error:", error);
    res.status(500).json({ message: "Failed to fetch departments" });
  }
};

/* =========================================================
   GET TRASHED DEPARTMENTS (Soft Deleted)
========================================================= */
exports.getTrashedDepartments = async (req, res) => {
  try {
    const trashed = await Department.findAll({
      where: {
        deletedAt: { [Op.not]: null },
      },
      paranoid: false,
      order: [["deletedAt", "DESC"]],
    });
    res.json({ trashed });
  } catch (error) {
    console.error("GET /departments/trashed error:", error);
    res.status(500).json({ message: "Failed to fetch trashed departments" });
  }
};

/* =========================================================
   CREATE DEPARTMENT
========================================================= */
exports.createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) return res.status(400).json({ message: "Department name is required" });

    const exists = await Department.findOne({ where: { name } });
    if (exists) return res.status(400).json({ message: "Department already exists" });

    const department = await Department.create({ name, description });
    res.status(201).json({ message: "Department created", department });
  } catch (error) {
    console.error("POST /departments error:", error);
    res.status(500).json({ message: "Failed to create department" });
  }
};

/* =========================================================
   UPDATE DEPARTMENT
========================================================= */
exports.updateDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    const department = await Department.findByPk(id);
    if (!department) return res.status(404).json({ message: "Department not found" });

    const { name, description } = req.body;
    await department.update({ name, description });

    res.json({ message: "Department updated", department });
  } catch (error) {
    console.error("PUT /departments/:id error:", error);
    res.status(500).json({ message: "Failed to update department" });
  }
};

/* =========================================================
   DELETE DEPARTMENT (Soft Delete)
========================================================= */
exports.deleteDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    const department = await Department.findByPk(id);
    if (!department) return res.status(404).json({ message: "Department not found" });

    await department.destroy(); // soft delete
    res.json({ message: "Department soft-deleted" });
  } catch (error) {
    console.error("DELETE /departments/:id error:", error);
    res.status(500).json({ message: "Failed to delete department" });
  }
};

/* =========================================================
   RESTORE DEPARTMENT
========================================================= */
exports.restoreDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    const department = await Department.findByPk(id, { paranoid: false });
    if (!department) return res.status(404).json({ message: "Department not found" });

    await department.restore();
    res.json({ message: "Department restored", department });
  } catch (error) {
    console.error("RESTORE /departments/:id error:", error);
    res.status(500).json({ message: "Failed to restore department" });
  }
};

/* =========================================================
   PERMANENT DELETE DEPARTMENT
========================================================= */
exports.permanentDeleteDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    const department = await Department.findByPk(id, { paranoid: false });
    if (!department) return res.status(404).json({ message: "Department not found" });

    await department.destroy({ force: true }); // permanent delete
    res.json({ message: "Department permanently deleted" });
  } catch (error) {
    console.error("FORCE DELETE /departments/:id error:", error);
    res.status(500).json({ message: "Failed to permanently delete department" });
  }
};
