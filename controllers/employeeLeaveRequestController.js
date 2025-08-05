const {
  EmployeeLeaveRequest,
  EmployeeLeaveBalance,
  EmployeeAttendance,
  Employee,
  Department,
  LeaveType,
} = require("../models");

// =============================================================
// Create Leave Request (auto–resolve employee_id)
// =============================================================
exports.createLeaveRequest = async (req, res) => {
  try {
    const {
      leave_type_id,
      start_date,
      end_date,
      reason,
      is_without_pay = false,
    } = req.body;

    const userId = req.user.id;
    const employee = await Employee.findOne({ where: { user_id: userId } });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found for this user." });
    }

    const request = await EmployeeLeaveRequest.create({
      employee_id: employee.id,
      leave_type_id,
      start_date,
      end_date,
      reason,
      is_without_pay,
      status: "pending",
    });

    res.status(201).json({ message: "Leave request submitted", data: request });
  } catch (err) {
    console.error("createLeaveRequest error:", err);
    res.status(500).json({ error: "Failed to create leave request" });
  }
};

// =============================================================
// Get only the logged‑in user’s leave requests
// =============================================================
exports.getOwnLeaveRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findOne({ where: { user_id: userId } });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found for this user." });
    }

    const data = await EmployeeLeaveRequest.findAll({
      where: { employee_id: employee.id },
    });

    res.json({ data });
  } catch (err) {
    console.error("getOwnLeaveRequests error:", err);
    res.status(500).json({ error: "Failed to fetch your leave requests" });
  }
};

// =============================================================
// Get all leave requests (reviewer‑only, with optional filters)
// =============================================================
exports.getAllLeaveRequests = async (req, res) => {
  try {
    const { employee_id, status } = req.query;
    const where = {};
    if (employee_id) where.employee_id = employee_id;
    if (status) where.status = status;

    const data = await EmployeeLeaveRequest.findAll({
      where,
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "name"],
          include: [
            {
              model: Department,
              as: "department", // ✅ fixed alias
              attributes: ["name"],
            },
          ],
        },
        {
          model: LeaveType,
          as: "leaveType", // ✅ ensure alias is defined in model
          attributes: ["id", "name", "abbreviation"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ data });
  } catch (err) {
    console.error("getAllLeaveRequests error:", err);
    res.status(500).json({ error: "Failed to fetch leave requests" });
  }
};

// =============================================================
// Approve / Reject Leave Request (reviewer‑only)
// Includes: Attendance auto-marking + Balance deduction
// =============================================================
exports.updateLeaveRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const reviewerUserId = req.user.id;
    const reviewerEmployeeId = req.user.employee_id;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const request = await EmployeeLeaveRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.employee_id === reviewerEmployeeId) {
      return res.status(403).json({ error: "Cannot approve/reject your own request" });
    }

    request.status = status;
    request.reviewed_by = reviewerUserId;
    request.reviewed_at = new Date();
    request.remarks = remarks || null;
    await request.save();

    const start = new Date(request.start_date);
    const end = new Date(request.end_date);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (status === "approved") {
      if (!request.is_without_pay) {
        const balance = await EmployeeLeaveBalance.findOne({
          where: {
            employee_id: request.employee_id,
            leave_type_id: request.leave_type_id,
          },
        });

        if (balance) {
          balance.used += days;
          balance.current_balance =
            balance.opening_balance + balance.accrued - balance.used + balance.carry_forwarded;
          await balance.save();
        }
      }

      const attendanceStatus = request.is_without_pay ? "half_day_without_pay" : "leave";

      for (let d = new Date(start.getTime()); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];

        await EmployeeAttendance.upsert({
          employee_id: request.employee_id,
          date: dateStr,
          status: attendanceStatus,
          remarks: `Auto-marked as ${attendanceStatus} on leave approval`,
        });
      }
    }

    res.json({ message: `Request ${status}`, data: request });
  } catch (err) {
    console.error("updateLeaveRequestStatus error:", err);
    res.status(500).json({ error: "Failed to update leave request" });
  }
};

// =============================================================
// Update (edit) a pending request (own request only)
// =============================================================
exports.updateLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      leave_type_id,
      start_date,
      end_date,
      reason,
      is_without_pay = false,
    } = req.body;

    const userId = req.user.id;
    const employee = await Employee.findOne({ where: { user_id: userId } });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found for this user." });
    }

    const request = await EmployeeLeaveRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.employee_id !== employee.id) {
      return res.status(403).json({ error: "Not authorized to edit this request" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ error: "Only pending requests can be edited" });
    }

    request.leave_type_id = leave_type_id;
    request.start_date = start_date;
    request.end_date = end_date;
    request.reason = reason;
    request.is_without_pay = is_without_pay;
    await request.save();

    res.json({ message: "Leave request updated", data: request });
  } catch (err) {
    console.error("updateLeaveRequest error:", err);
    res.status(500).json({ error: "Failed to update leave request" });
  }
};
