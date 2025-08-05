const { LeaveType } = require("../models");

// Create new leave type
exports.createLeaveType = async (req, res) => {
  try {
    const {
      name,
      accrual_frequency = "monthly",
      accrual_amount = 1,
      max_per_year,
      carry_forward = false,
      days_interval,
      is_active = true,
    } = req.body;

    if (!name || !accrual_frequency || accrual_amount == null) {
      return res.status(400).json({ error: "Name, frequency, and accrual amount are required" });
    }

    const existing = await LeaveType.findOne({ where: { name } });
    if (existing) {
      return res.status(409).json({ error: "Leave type already exists" });
    }

    const leaveType = await LeaveType.create({
      name,
      accrual_frequency,
      accrual_amount,
      max_per_year,
      carry_forward,
      days_interval,
      is_active,
    });

    res.status(201).json({ message: "Leave type created successfully", data: leaveType });
  } catch (err) {
    console.error("createLeaveType error:", err);
    res.status(500).json({ error: "Failed to create leave type" });
  }
};

// Get all leave types
exports.getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.findAll({ order: [["name", "ASC"]] });
    res.json({ data: leaveTypes });
  } catch (err) {
    console.error("getLeaveTypes error:", err);
    res.status(500).json({ error: "Failed to fetch leave types" });
  }
};

// Update leave type
exports.updateLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const leaveType = await LeaveType.findByPk(id);

    if (!leaveType) {
      return res.status(404).json({ error: "Leave type not found" });
    }

    await leaveType.update(req.body);
    res.json({ message: "Leave type updated successfully", data: leaveType });
  } catch (err) {
    console.error("updateLeaveType error:", err);
    res.status(500).json({ error: "Failed to update leave type" });
  }
};

// Delete leave type
exports.deleteLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const leaveType = await LeaveType.findByPk(id);

    if (!leaveType) {
      return res.status(404).json({ error: "Leave type not found" });
    }

    await leaveType.destroy();
    res.json({ message: "Leave type deleted successfully" });
  } catch (err) {
    console.error("deleteLeaveType error:", err);
    res.status(500).json({ error: "Failed to delete leave type" });
  }
};
