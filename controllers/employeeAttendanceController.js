const { EmployeeAttendance, Employee, Department } = require("../models");
const { Op } = require("sequelize");

// 🔐 Role check
const isHRorSuperadmin = (roles = []) =>
  roles.includes("hr") || roles.includes("superadmin");

/* =========================================================
   MARK ATTENDANCE (bulk or single)
========================================================= */
exports.markAttendance = async (req, res) => {
  const roles = req.user?.roles || [];
  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const { attendances = [], date } = req.body;

  if (!Array.isArray(attendances) || !date) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  try {
    const upserts = await Promise.all(
      attendances.map(async ({ employee_id, status, remarks }) => {
        return await EmployeeAttendance.upsert(
          { employee_id, date, status, remarks },
          { fields: ["status", "remarks"], returning: true }
        );
      })
    );

    res.json({ message: "Attendance marked successfully", count: upserts.length });
  } catch (err) {
    console.error("Attendance marking error:", err);
    res.status(500).json({ message: "Failed to mark attendance", error: err.message });
  }
};

/* =========================================================
   GET ATTENDANCE BY DATE
========================================================= */
exports.getAttendanceByDate = async (req, res) => {
  const roles = req.user?.roles || [];
  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const { date } = req.query;
  if (!date) return res.status(400).json({ message: "Date is required" });

  try {
    const records = await EmployeeAttendance.findAll({
      where: { date },
      include: [
        {
          model: Employee,
          as: "employee", // ✅ correct alias
          include: [
            {
              model: Department,
              as: "department", // ✅ correct alias
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [["employee_id", "ASC"]],
    });

    res.json({ records });
  } catch (err) {
    console.error("Fetch attendance error:", err);
    res.status(500).json({ message: "Failed to fetch attendance", error: err.message });
  }
};

/* =========================================================
   GET ATTENDANCE FOR AN EMPLOYEE
========================================================= */
exports.getAttendanceByEmployee = async (req, res) => {
  const roles = req.user?.roles || [];
  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const { employee_id } = req.params;

  try {
    const records = await EmployeeAttendance.findAll({
      where: { employee_id },
      order: [["date", "DESC"]],
    });

    res.json({ records });
  } catch (err) {
    console.error("Get employee attendance error:", err);
    res.status(500).json({ message: "Failed to fetch attendance", error: err.message });
  }
};

/* =========================================================
   GET MONTHLY SUMMARY (per employee)
========================================================= */
exports.getMonthlySummary = async (req, res) => {
  const roles = req.user?.roles || [];
  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const { month } = req.query; // Format: YYYY-MM
  if (!month) return res.status(400).json({ message: "Month is required (YYYY-MM)" });

  const start = new Date(`${month}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  try {
    const records = await EmployeeAttendance.findAll({
      where: {
        date: {
          [Op.gte]: start,
          [Op.lt]: end,
        },
      },
      include: [
        {
          model: Employee,
          as: "employee", // ✅ correct alias
          attributes: ["id", "name"],
        },
      ],
      order: [["employee_id", "ASC"]],
    });

    // Group summary
    const summary = {};
    for (const record of records) {
      const eid = record.employee_id;
      const employeeName = record.employee?.name || "Unknown";

      if (!summary[eid]) {
        summary[eid] = { employee: employeeName, counts: {} };
      }

      summary[eid].counts[record.status] = (summary[eid].counts[record.status] || 0) + 1;
    }

    res.json({ month, summary });
  } catch (err) {
    console.error("Fetch summary error:", err);
    res.status(500).json({ message: "Failed to fetch summary", error: err.message });
  }
};


/* =========================================================
   GET LOGGED-IN EMPLOYEE'S ATTENDANCE CALENDAR (month view)
========================================================= */
exports.getMyAttendanceCalendar = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { month } = req.query; // Format: YYYY-MM (e.g., 2025-07)

    if (!month) {
      return res.status(400).json({ message: "Month is required (format: YYYY-MM)" });
    }

    const employee = await Employee.findOne({ where: { user_id: userId } });

    if (!employee) {
      return res.status(404).json({ message: "Employee record not found" });
    }

    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const records = await EmployeeAttendance.findAll({
      where: {
        employee_id: employee.id,
        date: {
          [Op.gte]: startDate,
          [Op.lt]: endDate,
        },
      },
      attributes: ["id", "date", "status", "remarks"],
      order: [["date", "ASC"]],
    });

    res.json({ month, employee_id: employee.id, records });
  } catch (err) {
    console.error("Error in getMyAttendanceCalendar:", err);
    res.status(500).json({ message: "Failed to fetch attendance calendar", error: err.message });
  }
};


/* =========================================================
   GET FULL ATTENDANCE SUMMARY FOR SPECIFIC EMPLOYEE
   (calendar + status breakdown for a month)
========================================================= */
exports.getEmployeeAttendanceSummary = async (req, res) => {
  const roles = req.user?.roles || [];
  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const { employee_id } = req.params;
  const { month } = req.query;

  if (!month) {
    return res.status(400).json({ message: "Month is required (format: YYYY-MM)" });
  }

  try {
    const employee = await Employee.findOne({
      where: { id: employee_id },
      include: [
        { model: Department, as: "department", attributes: ["id", "name"] },
      ],
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const records = await EmployeeAttendance.findAll({
      where: {
        employee_id,
        date: {
          [Op.gte]: startDate,
          [Op.lt]: endDate,
        },
      },
      attributes: ["id", "date", "status", "remarks"],
      order: [["date", "ASC"]],
    });

    // Generate counts
    const summary = {};
    for (const rec of records) {
      summary[rec.status] = (summary[rec.status] || 0) + 1;
    }

    res.json({
      employee: {
        id: employee.id,
        name: employee.name,
        employee_id: employee.employee_id,
        department: employee.department,
      },
      month,
      records,
      summary,
    });
  } catch (err) {
    console.error("Error in getEmployeeAttendanceSummary:", err);
    res.status(500).json({ message: "Failed to fetch employee summary", error: err.message });
  }
};

