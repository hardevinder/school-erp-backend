const {
  EmployeeLeaveBalance,
  Employee,
  Department,
  LeaveType,
} = require("../models");

// Helper to compute current balance
function calcCurrent(opening, accrued, used, carry) {
  return Number(opening) + Number(accrued) - Number(used) + Number(carry);
}

// =============================================================
// GET Leave Balances with optional filters
// =============================================================
exports.getEmployeeLeaveBalances = async (req, res) => {
  try {
    const { employee_id, leave_type_id } = req.query;
    const where = {};
    if (employee_id) where.employee_id = employee_id;
    if (leave_type_id) where.leave_type_id = leave_type_id;

    const balances = await EmployeeLeaveBalance.findAll({
      where,
      include: [
        {
          model: Employee,
          as: "employee",
          include: [
            {
              model: Department,
              as: "department",
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: LeaveType,
          as: "leaveType",
        },
      ],
      order: [["employee_id", "ASC"]],
    });

    res.json({ data: balances });
  } catch (err) {
    console.error("getEmployeeLeaveBalances error:", err);
    res.status(500).json({ error: "Failed to fetch leave balances" });
  }
};

// =============================================================
// CREATE a new Leave Balance
// =============================================================
exports.createEmployeeLeaveBalance = async (req, res) => {
  try {
    let {
      employee_id,
      leave_type_id,
      year = new Date().getFullYear(),
      opening_balance = 0,
      accrued = 0,
      used = 0,
      carry_forwarded = 0,
    } = req.body;

    // Validation
    if (employee_id === undefined || leave_type_id === undefined) {
      return res.status(400).json({
        error: "employee_id and leave_type_id are required",
      });
    }

    // Parse & Validate
    employee_id = parseInt(employee_id, 10);
    leave_type_id = parseInt(leave_type_id, 10);
    year = parseInt(year, 10);
    opening_balance = parseFloat(opening_balance);
    accrued = parseFloat(accrued);
    used = parseFloat(used);
    carry_forwarded = parseFloat(carry_forwarded);

    if (isNaN(employee_id) || isNaN(leave_type_id)) {
      return res.status(400).json({
        error: "employee_id and leave_type_id must be valid integers",
      });
    }

    // Compute balance
    const current_balance = calcCurrent(
      opening_balance,
      accrued,
      used,
      carry_forwarded
    );

    // Upsert
    const [record, created] = await EmployeeLeaveBalance.findOrCreate({
      where: { employee_id, leave_type_id },
      defaults: {
        year,
        opening_balance,
        accrued,
        used,
        carry_forwarded,
        current_balance,
      },
    });

    if (!created) {
      return res
        .status(400)
        .json({ error: "Leave balance record already exists" });
    }

    res.status(201).json({
      message: "Leave balance created",
      data: record,
    });
  } catch (err) {
    console.error("createEmployeeLeaveBalance error:", err);
    res.status(500).json({ error: "Failed to create leave balance" });
  }
};

// =============================================================
// UPDATE Leave Balance (with recalculation)
// =============================================================
exports.updateEmployeeLeaveBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      year,
      opening_balance,
      accrued,
      used,
      carry_forwarded,
    } = req.body;

    const record = await EmployeeLeaveBalance.findByPk(id);
    if (!record) {
      return res.status(404).json({ error: "Leave balance not found" });
    }

    // Update if provided
    if (year !== undefined) record.year = year;
    if (opening_balance !== undefined) record.opening_balance = opening_balance;
    if (accrued !== undefined) record.accrued = accrued;
    if (used !== undefined) record.used = used;
    if (carry_forwarded !== undefined)
      record.carry_forwarded = carry_forwarded;

    // Recalculate
    record.current_balance = calcCurrent(
      record.opening_balance,
      record.accrued,
      record.used,
      record.carry_forwarded
    );

    await record.save();

    res.json({ message: "Leave balance updated", data: record });
  } catch (err) {
    console.error("updateEmployeeLeaveBalance error:", err);
    res.status(500).json({ error: "Failed to update leave balance" });
  }
};

// =============================================================
// DELETE Leave Balance
// =============================================================
exports.deleteEmployeeLeaveBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await EmployeeLeaveBalance.findByPk(id);
    if (!record) {
      return res.status(404).json({ error: "Leave balance not found" });
    }

    await record.destroy();
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("deleteEmployeeLeaveBalance error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
};
