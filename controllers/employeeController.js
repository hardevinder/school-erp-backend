// controllers/employeeController.js
const { Employee, Department, User } = require("../models");
const path = require("path");
const ExcelJS = require("exceljs");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const { Op } = require("sequelize");

exports.uploadMiddleware = upload.single("file");

// 🔒 Helper to check role
const isHRorSuperadmin = (roles = []) =>
  roles.includes("superadmin") || roles.includes("hr");

/* =========================================================
   GET ALL EMPLOYEES  (RAW+NESTED -> no circular refs)
========================================================= */
exports.getEmployees = async (req, res) => {
  const roles = req.user?.roles || [];
  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const { search, department_id, dob, joining_date, status } = req.query;

  try {
    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };  // MySQL
    if (department_id) where.department_id = department_id;
    if (dob) where.dob = dob;
    if (joining_date) where.joining_date = joining_date;

    const userInclude = {
      model: User,
      as: "userAccount",
      attributes: ["id", "username", "email", "status"],
      required: false,
    };
    if (status) userInclude.where = { status };

    const employees = await Employee.findAll({
      where,
      attributes: [
        "id",
        "employee_id",
        "name",
        "gender",
        "dob",
        "phone",
        "email",
        "aadhaar_number",
        "pan_number",
        "educational_qualification",
        "professional_qualification",
        "experience_years",
        "blood_group",
        "emergency_contact",
        "marital_status",
        "photo_url",
        "bank_account_number",
        "ifsc_code",
        "bank_name",
        "account_holder_name",
        "department_id",
        "designation",
        "joining_date",
        "address",
        "status",
        "user_id",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["id", "name"],
          required: false,
        },
        userInclude,
      ],
      order: [["id", "DESC"]],
      raw: true,   // 👈 return plain objects
      nest: true,  // 👈 keep include nesting (department.*, userAccount.*)
    });

    // employees is already plain JSON-safe
    return res.json({ employees });
  } catch (err) {
    console.error("GET /employees error:", err);
    return res
      .status(500)
      .json({ message: "Failed to fetch employees", error: err.message });
  }
};

/* =========================================================
   CREATE EMPLOYEE
========================================================= */
exports.createEmployee = async (req, res) => {
  const roles = req.user?.roles || [];
  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const data = { ...req.body };

    // 📸 Handle profile photo
    if (req.file) data.photo_url = `/uploads/${req.file.filename}`;

    // 🔢 Generate next employee ID like 0001, 0002...
    const lastEmployee = await Employee.findOne({ order: [["id", "DESC"]], raw: true });
    const nextId = lastEmployee ? lastEmployee.id + 1 : 1;
    data.employee_id = String(nextId).padStart(4, "0");

    const created = await Employee.create(data);
    // fetch back as plain raw row (optional, for consistency)
    const employee = await Employee.findByPk(created.id, {
      attributes: [
        "id",
        "employee_id",
        "name",
        "gender",
        "dob",
        "phone",
        "email",
        "aadhaar_number",
        "pan_number",
        "educational_qualification",
        "professional_qualification",
        "experience_years",
        "blood_group",
        "emergency_contact",
        "marital_status",
        "photo_url",
        "bank_account_number",
        "ifsc_code",
        "bank_name",
        "account_holder_name",
        "department_id",
        "designation",
        "joining_date",
        "address",
        "status",
        "user_id",
        "createdAt",
        "updatedAt",
      ],
      include: [
        { model: Department, as: "department", attributes: ["id", "name"], required: false },
        { model: User, as: "userAccount", attributes: ["id", "username", "email", "status"], required: false },
      ],
      raw: true,
      nest: true,
    });

    return res.status(201).json({ message: "Employee created", employee });
  } catch (err) {
    console.error("POST /employees error:", err);
    return res.status(500).json({
      message: "Failed to create employee",
      error: err.message,
      details: err.errors || [],
    });
  }
};

/* =========================================================
   UPDATE EMPLOYEE
========================================================= */
exports.updateEmployee = async (req, res) => {
  const roles = req.user?.roles || [];
  const { id } = req.params;
  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const employee = await Employee.findByPk(id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const updateData = { ...req.body };
    if (req.file) updateData.photo_url = `/uploads/${req.file.filename}`;
    await employee.update(updateData);

    // return plain raw row
    const refreshed = await Employee.findByPk(id, {
      attributes: [
        "id",
        "employee_id",
        "name",
        "gender",
        "dob",
        "phone",
        "email",
        "aadhaar_number",
        "pan_number",
        "educational_qualification",
        "professional_qualification",
        "experience_years",
        "blood_group",
        "emergency_contact",
        "marital_status",
        "photo_url",
        "bank_account_number",
        "ifsc_code",
        "bank_name",
        "account_holder_name",
        "department_id",
        "designation",
        "joining_date",
        "address",
        "status",
        "user_id",
        "createdAt",
        "updatedAt",
      ],
      include: [
        { model: Department, as: "department", attributes: ["id", "name"], required: false },
        { model: User, as: "userAccount", attributes: ["id", "username", "email", "status"], required: false },
      ],
      raw: true,
      nest: true,
    });

    return res.json({ message: "Employee updated", employee: refreshed });
  } catch (err) {
    console.error("PUT /employees/:id error:", err);
    return res.status(500).json({ message: "Failed to update employee", error: err.message });
  }
};

/* =========================================================
   DELETE EMPLOYEE
========================================================= */
exports.deleteEmployee = async (req, res) => {
  const roles = req.user?.roles || [];
  const { id } = req.params;
  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const employee = await Employee.findByPk(id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    await employee.destroy();
    return res.json({ message: "Employee deleted" });
  } catch (err) {
    console.error("DELETE /employees/:id error:", err);
    return res.status(500).json({ message: "Failed to delete employee", error: err.message });
  }
};

/* =========================================================
   EXPORT EMPLOYEE TEMPLATE
========================================================= */
exports.exportEmployeeTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Employee Template");

    const headers = [
      { header: "*Name", key: "name" },
      { header: "*Gender", key: "gender" },
      { header: "*DOB", key: "dob" },
      { header: "*Phone", key: "phone" },
      { header: "Email", key: "email" },
      { header: "*Aadhaar Number", key: "aadhaar_number" },
      { header: "PAN Number", key: "pan_number" },
      { header: "Educational Qualification", key: "educational_qualification" },
      { header: "Professional Qualification", key: "professional_qualification" },
      { header: "Experience Years", key: "experience_years" },
      { header: "Blood Group", key: "blood_group" },
      { header: "Emergency Contact", key: "emergency_contact" },
      { header: "Marital Status", key: "marital_status" },
      { header: "*Department ID", key: "department_id" },
      { header: "*Designation", key: "designation" },
      { header: "*Joining Date", key: "joining_date" },
      { header: "Address", key: "address" },
    ];

    sheet.columns = headers;

    // Highlight mandatory headers
    sheet.getRow(1).eachCell((cell) => {
      if (String(cell.value || "").startsWith("*")) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFCC" },
        };
      }
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=employee_template.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export error:", err);
    return res.status(500).json({ message: "Failed to export employee template", error: err.message });
  }
};

/* =========================================================
   IMPORT EMPLOYEES
========================================================= */
exports.importEmployees = async (req, res) => {
  const roles = req.user?.roles || [];
  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: "Access denied" });
  }
  if (!req.file) {
    return res.status(400).json({ message: "File missing" });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.resolve(req.file.path);
    await workbook.xlsx.readFile(filePath);

    const sheet = workbook.worksheets[0];
    const duplicates = [];
    let insertedCount = 0;

    for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);
      const [
        name,
        gender,
        dob,
        phone,
        email,
        aadhaar_number,
        pan_number,
        educational_qualification,
        professional_qualification,
        experience_years,
        blood_group,
        emergency_contact,
        marital_status,
        department_id,
        designation,
        joining_date,
        address,
      ] = [
        row.getCell(1).value,
        row.getCell(2).value,
        row.getCell(3).value,
        row.getCell(4).value,
        row.getCell(5).value,
        row.getCell(6).value,
        row.getCell(7).value,
        row.getCell(8).value,
        row.getCell(9).value,
        row.getCell(10).value,
        row.getCell(11).value,
        row.getCell(12).value,
        row.getCell(13).value,
        row.getCell(14).value,
        row.getCell(15).value,
        row.getCell(16).value,
        row.getCell(17).value,
      ];

      if (!name || !gender || !dob || !aadhaar_number || !department_id || !designation || !joining_date) {
        continue;
      }

      const exists = await Employee.findOne({ where: { aadhaar_number }, raw: true });
      if (exists) {
        duplicates.push(aadhaar_number);
        continue;
      }

      const last = await Employee.findOne({ order: [["id", "DESC"]], raw: true });
      const nextId = last ? last.id + 1 : 1;
      const employee_id = String(nextId).padStart(4, "0");

      await Employee.create({
        employee_id,
        name,
        gender,
        dob,
        phone,
        email,
        aadhaar_number,
        pan_number,
        educational_qualification,
        professional_qualification,
        experience_years,
        blood_group,
        emergency_contact,
        marital_status,
        department_id,
        designation,
        joining_date,
        address,
        status: "enabled",
      });

      insertedCount++;
    }

    return res.json({
      message: "Import complete",
      insertedCount,
      duplicateCount: duplicates.length,
      duplicates,
    });
  } catch (err) {
    console.error("Import error:", err);
    return res.status(500).json({ message: "Failed to import employees", error: err.message });
  }
};

/* =========================================================
   EXPORT EMPLOYEES DATA  (RAW+NESTED)
========================================================= */
exports.exportEmployeesData = async (req, res) => {
  const roles = req.user?.roles || [];
  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const { search, department_id, dob, joining_date, status } = req.query;

  try {
    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };
    if (department_id) where.department_id = department_id;
    if (dob) where.dob = dob;
    if (joining_date) where.joining_date = joining_date;

    const userInclude = {
      model: User,
      as: "userAccount",
      attributes: ["status"],
      required: false,
    };
    if (status) userInclude.where = { status };

    const rows = await Employee.findAll({
      where,
      attributes: [
        "employee_id",
        "name",
        "gender",
        "dob",
        "phone",
        "email",
        "aadhaar_number",
        "pan_number",
        "department_id",
        "designation",
        "joining_date",
        "address",
      ],
      include: [
        { model: Department, as: "department", attributes: ["id", "name"], required: false },
        userInclude,
      ],
      order: [["id", "DESC"]],
      raw: true,
      nest: true,
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Employees");

    sheet.columns = [
      { header: "Emp ID", key: "employee_id", width: 10 },
      { header: "Name", key: "name", width: 25 },
      { header: "Gender", key: "gender", width: 10 },
      { header: "DOB", key: "dob", width: 12 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Aadhaar Number", key: "aadhaar_number", width: 20 },
      { header: "PAN Number", key: "pan_number", width: 15 },
      { header: "Dept ID", key: "department_id", width: 10 },
      { header: "Dept Name", key: "department_name", width: 20 },
      { header: "Designation", key: "designation", width: 20 },
      { header: "Joining Date", key: "joining_date", width: 12 },
      { header: "Status", key: "status", width: 10 },
      { header: "Address", key: "address", width: 30 },
    ];

    sheet.getRow(1).font = { bold: true };

    rows.forEach((emp) => {
      sheet.addRow({
        employee_id: emp.employee_id,
        name: emp.name,
        gender: emp.gender,
        dob: emp.dob,
        phone: emp.phone,
        email: emp.email,
        aadhaar_number: emp.aadhaar_number,
        pan_number: emp.pan_number,
        department_id: emp.department_id,
        department_name: emp.department?.name || "",
        designation: emp.designation,
        joining_date: emp.joining_date,
        status: emp.userAccount?.status || "",
        address: emp.address,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=employees_export.xlsx"
    );
    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    console.error("EXPORT DATA error:", err);
    return res.status(500).json({ message: "Failed to export employees", error: err.message });
  }
};
