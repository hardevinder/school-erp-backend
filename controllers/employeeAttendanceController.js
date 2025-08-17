const { EmployeeAttendance, Employee, Department } = require("../models");
const { Op } = require("sequelize");

/* =========================
   Helpers
========================= */
const getAuthUser = (req) => req.authUser || req.user || null;

const extractRoles = (user) => {
  if (!user) return [];
  if (Array.isArray(user.roles)) {
    if (typeof user.roles[0] === "string") return user.roles;
    if (typeof user.roles[0] === "object") return user.roles.map((r) => r.name || r.role || r);
  }
  return [];
};

const isHRorSuperadmin = (roles = []) => roles.includes("hr") || roles.includes("superadmin");

// "HH:mm" or "HH:mm:ss" -> "HH:mm:ss"; invalid -> null
function normalizeTime(val) {
  if (!val || typeof val !== "string") return null;
  const m = val.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const [ , hh, mm, ss ] = m;
  if (Number(hh) > 23 || Number(mm) > 59 || (ss && Number(ss) > 59)) return null;
  return `${hh}:${mm}:${ss || "00"}`;
}

/* =========================================================
   MARK ATTENDANCE (bulk or single)
   Body: { date, attendances: [{ employee_id, status, remarks?, in_time?, out_time? }] }
========================================================= */
async function markAttendance(req, res) {
  const user = getAuthUser(req);
  const roles = extractRoles(user);
  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const { attendances = [], date } = req.body;
  if (!Array.isArray(attendances) || !date) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  try {
    // Skip entries with no status to avoid DB NOT NULL errors on ENUM
    const sanitized = attendances
      .filter((a) => a && a.employee_id && a.status) // keep only valid rows
      .map(({ employee_id, status, remarks, in_time, out_time }) => ({
        employee_id,
        date,
        status,
        remarks: remarks || "",
        in_time: normalizeTime(in_time),
        out_time: normalizeTime(out_time),
      }));

    const upserts = await Promise.all(
      sanitized.map((row) =>
        EmployeeAttendance.upsert(row, {
          // explicitly list fields we allow to be updated
          fields: ["status", "remarks", "in_time", "out_time", "date", "employee_id"],
          returning: true,
        })
      )
    );

    res.json({
      message: "Attendance marked successfully",
      count: upserts.length,
      skipped: attendances.length - sanitized.length, // FYI for UI: rows skipped due to missing status
    });
  } catch (err) {
    console.error("Attendance marking error:", err);
    res.status(500).json({ message: "Failed to mark attendance", error: err.message });
  }
}

/* =========================================================
   GET ATTENDANCE BY DATE (HR view)
   Query: ?date=YYYY-MM-DD
========================================================= */
async function getAttendanceByDate(req, res) {
  const user = getAuthUser(req);
  const roles = extractRoles(user);
  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const { date } = req.query;
  if (!date) return res.status(400).json({ message: "Date is required" });

  try {
    const records = await EmployeeAttendance.findAll({
      where: { date },
      attributes: ["id", "employee_id", "date", "status", "remarks", "in_time", "out_time"],
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "name", "employee_id"],
          include: [{ model: Department, as: "department", attributes: ["id", "name"] }],
        },
      ],
      order: [["employee_id", "ASC"]],
    });

    res.json({ records });
  } catch (err) {
    console.error("Fetch attendance error:", err);
    res.status(500).json({ message: "Failed to fetch attendance", error: err.message });
  }
}

/* =========================================================
   GET ATTENDANCE FOR AN EMPLOYEE (HR view)
   Params: :employee_id
========================================================= */
async function getAttendanceByEmployee(req, res) {
  const user = getAuthUser(req);
  const roles = extractRoles(user);
  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const { employee_id } = req.params;

  try {
    const records = await EmployeeAttendance.findAll({
      where: { employee_id },
      attributes: ["id", "date", "status", "remarks", "in_time", "out_time"],
      order: [["date", "DESC"]],
    });

    res.json({ records });
  } catch (err) {
    console.error("Get employee attendance error:", err);
    res.status(500).json({ message: "Failed to fetch attendance", error: err.message });
  }
}

/* =========================================================
   GET MONTHLY SUMMARY FOR ALL EMPLOYEES (HR view)
   Query: ?month=YYYY-MM
========================================================= */
async function getMonthlySummary(req, res) {
  const user = getAuthUser(req);
  const roles = extractRoles(user);
  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const { month } = req.query;
  if (!month) return res.status(400).json({ message: "Month is required (YYYY-MM)" });

  const start = new Date(`${month}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  try {
    const records = await EmployeeAttendance.findAll({
      where: { date: { [Op.gte]: start, [Op.lt]: end } },
      attributes: ["employee_id", "date", "status"],
      include: [{ model: Employee, as: "employee", attributes: ["id", "name"] }],
      order: [["employee_id", "ASC"]],
    });

    const summary = {};
    for (const record of records) {
      const eid = record.employee_id;
      const employeeName = record.employee?.name || "Unknown";
      if (!summary[eid]) summary[eid] = { employee: employeeName, counts: {} };
      summary[eid].counts[record.status] = (summary[eid].counts[record.status] || 0) + 1;
    }

    res.json({ month, summary });
  } catch (err) {
    console.error("Fetch summary error:", err);
    res.status(500).json({ message: "Failed to fetch summary", error: err.message });
  }
}

/* =========================================================
   EMPLOYEE: MY CALENDAR (month view)
   Query: ?month=YYYY-MM
========================================================= */
async function getMyAttendanceCalendar(req, res) {
  try {
    const user = getAuthUser(req);
    const userId = user?.id;
    const { month } = req.query;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!month) return res.status(400).json({ message: "Month is required (format: YYYY-MM)" });

    const employee = await Employee.findOne({ where: { user_id: userId } });
    if (!employee) return res.status(404).json({ message: "Employee record not found" });

    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const records = await EmployeeAttendance.findAll({
      where: {
        employee_id: employee.id,
        date: { [Op.gte]: startDate, [Op.lt]: endDate },
      },
      attributes: ["id", "date", "status", "remarks", "in_time", "out_time"],
      order: [["date", "ASC"]],
    });

    res.json({ month, employee_id: employee.id, records });
  } catch (err) {
    console.error("Error in getMyAttendanceCalendar:", err);
    res.status(500).json({ message: "Failed to fetch attendance calendar", error: err.message });
  }
}

/* =========================================================
   EMPLOYEE: MY CURRENT MONTH (compact)
========================================================= */
async function getMyCurrentMonthReport(req, res) {
  try {
    const user = getAuthUser(req);
    const userId = user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const emp = await Employee.findOne({ where: { user_id: userId }, attributes: ["id", "name"] });
    if (!emp) return res.status(400).json({ message: "No employee profile linked to this account." });

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const rows = await EmployeeAttendance.findAll({
      where: { employee_id: emp.id, date: { [Op.gte]: start, [Op.lt]: end } },
      order: [["date", "ASC"]],
      attributes: ["date", "status", "in_time", "out_time", "remarks"],
    });

    const counts = rows.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    res.json({ month, employee: { id: emp.id, name: emp.name }, counts, records: rows });
  } catch (err) {
    console.error("getMyCurrentMonthReport error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

/* =========================================================
   HR: CURRENT MONTH REPORT FOR ALL
========================================================= */
async function getCurrentMonthReportForAll(req, res) {
  const user = getAuthUser(req);
  const roles = extractRoles(user);
  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const rows = await EmployeeAttendance.findAll({
      where: { date: { [Op.gte]: start, [Op.lt]: end } },
      order: [["employee_id", "ASC"], ["date", "ASC"]],
      include: [{ model: Employee, as: "employee", attributes: ["id", "name"] }],
      attributes: ["employee_id", "date", "status"],
    });

    res.json({ month, data: rows });
  } catch (err) {
    console.error("getCurrentMonthReportForAll error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

/* =========================================================
   HR: EMPLOYEE ATTENDANCE SUMMARY (month view)
   Params: :employee_id, Query: ?month=YYYY-MM
========================================================= */
// REPLACE your getEmployeeAttendanceSummary with this version
async function getEmployeeAttendanceSummary(req, res) {
  const user = getAuthUser(req);
  const roles = extractRoles(user);
  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const { employee_id } = req.params;
  const { month } = req.query;
  if (!month) return res.status(400).json({ message: "Month is required (format: YYYY-MM)" });

  // Optional knobs
  const excludeSundays = (req.query.exclude_sundays ?? "true") === "true";
  const excludeHolidays = (req.query.exclude_holidays ?? "true") === "true";
  const shortLeaveFraction = Number(req.query.short_leave_fraction ?? 0.25); // 0, 0.25, 0.5, 1

  try {
    // Load employee + department
    const employee = await Employee.findOne({
      where: { id: employee_id },
      include: [{ model: Department, as: "department", attributes: ["id", "name"] }],
    });
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    // Month range
    const startDate = new Date(`${month}-01T00:00:00`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Fetch attendance rows (with times)
    const records = await EmployeeAttendance.findAll({
      where: { employee_id, date: { [Op.gte]: startDate, [Op.lt]: endDate } },
      attributes: ["id", "date", "status", "remarks", "in_time", "out_time"],
      order: [["date", "ASC"]],
    });

    // Count statuses
    const counts = {
      present: 0,
      absent: 0,
      leave: 0,
      full_day_leave: 0,
      first_half_day_leave: 0,
      second_half_day_leave: 0,
      half_day_without_pay: 0,
      short_leave: 0,
      // Anything unmarked is NOT counted here; it just doesn't increment a status.
    };
    for (const r of records) {
      if (r.status && counts.hasOwnProperty(r.status)) counts[r.status]++;
    }

    // Calendar metrics
    const year = startDate.getFullYear();
    const monthIdx = startDate.getMonth();
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

    // Sundays
    let sundays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, monthIdx, d).getDay(); // 0 = Sun
      if (day === 0) sundays++;
    }

    // Holidays (optional)
    let holidays = 0;
    try {
      const { Holiday } = require("../models");
      if (Holiday) {
        const holidayRows = await Holiday.findAll({
          where: { date: { [Op.gte]: startDate, [Op.lt]: endDate } },
          attributes: ["date"],
        });
        holidays = holidayRows.length || 0;
      }
    } catch {
      // no Holiday model; ignore
    }

    const calendarDays = daysInMonth;
    const workingDays =
      calendarDays
      - (excludeSundays ? sundays : 0)
      - (excludeHolidays ? holidays : 0);

    // Derived tallies
    const halfDaysCount =
      (counts.first_half_day_leave || 0) +
      (counts.second_half_day_leave || 0) +
      (counts.half_day_without_pay || 0);

    const halfDayEquivDays = 0.5 * halfDaysCount;

    // Leave day equivalents: full days + half-day equivalents (+ fraction for short leave)
    const leaveDaysEquiv =
      (counts.leave || 0) +
      (counts.full_day_leave || 0) +
      halfDayEquivDays +
      (counts.short_leave || 0) * (isFinite(shortLeaveFraction) ? shortLeaveFraction : 0.25);

    // Absent (full days only; adjust if your policy differs)
    const absentDays = counts.absent || 0;

    // Build + send
    res.json({
      employee: {
        id: employee.id,
        name: employee.name,
        employee_id: employee.employee_id,
        department: employee.department,
      },
      month,
      meta: {
        calendar_days: calendarDays,
        sundays,
        holidays,
        working_days: workingDays,
      },
      counts,   // raw status counts
      derived: {
        half_days_count: halfDaysCount,
        half_day_equiv_days: halfDayEquivDays,
        leave_days_equiv: leaveDaysEquiv,
        absent_days: absentDays,
      },
      records,  // keep full list so the modal calendar still works
    });
  } catch (err) {
    console.error("Error in getEmployeeAttendanceSummary:", err);
    res.status(500).json({ message: "Failed to fetch employee summary", error: err.message });
  }
}


/* ====== EXPORT ALL CONTROLLER FUNCTIONS ====== */
module.exports = {
  markAttendance,
  getAttendanceByDate,
  getAttendanceByEmployee,
  getMonthlySummary,
  getMyAttendanceCalendar,
  getMyCurrentMonthReport,
  getCurrentMonthReportForAll,
  getEmployeeAttendanceSummary,
};
