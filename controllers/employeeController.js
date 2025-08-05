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
   GET ALL EMPLOYEES
========================================================= */
exports.getEmployees = async (req, res) => {
  const roles = req.user?.roles || [];

  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const {
    search,          // name search
    department_id,
    dob,
    joining_date,
    status,          // enabled / disabled (User model)
  } = req.query;

  try {
    const employeeWhere = {};

    if (search) {
      employeeWhere.name = { [Op.iLike]: `%${search}%` };
    }

    if (department_id) {
      employeeWhere.department_id = department_id;
    }

    if (dob) {
      employeeWhere.dob = dob;
    }

    if (joining_date) {
      employeeWhere.joining_date = joining_date;
    }

    const userWhere = {};
    if (status) {
      userWhere.status = status;
    }

    const employees = await Employee.findAll({
      where: employeeWhere,
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "userAccount",
          attributes: ["id", "username", "email", "status"],
          where: Object.keys(userWhere).length ? userWhere : undefined,
          required: false, // still show employee even if no user account is linked
        },
      ],
      order: [["id", "DESC"]],
    });

    res.json({ employees });
  } catch (err) {
    console.error("GET /employees error:", err);
    res.status(500).json({ message: "Failed to fetch employees", error: err.message });
  }
};
/* =========================================================
   CREATE EMPLOYEE
========================================================= */
/* =========================================================
   CREATE EMPLOYEE
========================================================= */
exports.createEmployee = async (req, res) => {
  const roles = req.user?.roles || [];

  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const data = req.body;

    // 📸 Handle profile photo
    if (req.file) {
      data.photo_url = `/uploads/${req.file.filename}`;
    }

    // 🔢 Generate next employee ID like 0001, 0002...
    const lastEmployee = await Employee.findOne({
      order: [["id", "DESC"]],
    });

    const nextId = lastEmployee ? lastEmployee.id + 1 : 1;
    data.employee_id = String(nextId).padStart(4, "0"); // → '0001', '0002', etc.

    const employee = await Employee.create(data);
    res.status(201).json({ message: "Employee created", employee });
  } catch (err) {
    console.error("POST /employees error:", err);
    res.status(500).json({
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

    const updateData = req.body;

    // 📸 If photo updated
    if (req.file) {
      updateData.photo_url = `/uploads/${req.file.filename}`;
    }

    await employee.update(updateData);
    res.json({ message: "Employee updated", employee });
  } catch (err) {
    console.error("PUT /employees/:id error:", err);
    res.status(500).json({ message: "Failed to update employee" });
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
    res.json({ message: "Employee deleted" });
  } catch (err) {
    console.error("DELETE /employees/:id error:", err);
    res.status(500).json({ message: "Failed to delete employee" });
  }
};



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
          fgColor: { argb: "FFFFCC" }, // light yellow
        };
      }
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=employee_template.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ message: "Failed to export employee template" });
  }
};


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

    // start at row 2 to skip header
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

      // skip rows missing required fields
      if (
        !name ||
        !gender ||
        !dob ||
        !aadhaar_number ||
        !department_id ||
        !designation ||
        !joining_date
      ) {
        continue;
      }

      // avoid duplicate Aadhaar
      const exists = await Employee.findOne({
        where: { aadhaar_number },
      });
      if (exists) {
        duplicates.push(aadhaar_number);
        continue;
      }

      // generate employee_id
      const last = await Employee.findOne({ order: [["id", "DESC"]] });
      const nextId = last ? last.id + 1 : 1;
      const employee_id = String(nextId).padStart(4, "0");

      // create record
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

    res.json({
      message: "Import complete",
      insertedCount,
      duplicateCount: duplicates.length,
      duplicates,
    });
  } catch (err) {
    console.error("Import error:", err);
    res.status(500).json({
      message: "Failed to import employees",
      error: err.message,
    });
  }
};


exports.exportEmployeesData = async (req, res) => {
  const roles = req.user?.roles || [];
  if (!isHRorSuperadmin(roles)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // build same filters as GET /employees
  const { search, department_id, dob, joining_date, status } = req.query;
  const where = {};
  if (search) where.name = { [Op.iLike]: `%${search}%` };
  if (department_id) where.department_id = department_id;
  if (dob) where.dob = dob;
  if (joining_date) where.joining_date = joining_date;
  if (status) where['$userAccount.status$'] = status;

  try {
    const employees = await Employee.findAll({
      where,
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] }, // ✅ fixed alias
        { model: User, as: 'userAccount', attributes: ['status'] },
      ],
      order: [['id', 'DESC']],
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Employees');

    // define columns
    sheet.columns = [
      { header: 'Emp ID', key: 'employee_id', width: 10 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'DOB', key: 'dob', width: 12 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Aadhaar Number', key: 'aadhaar_number', width: 20 },
      { header: 'PAN Number', key: 'pan_number', width: 15 },
      { header: 'Dept ID', key: 'department_id', width: 10 },
      { header: 'Dept Name', key: 'department_name', width: 20 }, // updated to match department alias
      { header: 'Designation', key: 'designation', width: 20 },
      { header: 'Joining Date', key: 'joining_date', width: 12 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Address', key: 'address', width: 30 },
    ];

    // bold the header row
    sheet.getRow(1).font = { bold: true };

    // add each employee as a row
    employees.forEach(emp => {
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
        department_name: emp.department?.name || '', // ✅ use correct alias
        designation: emp.designation,
        joining_date: emp.joining_date,
        status: emp.userAccount?.status || '',
        address: emp.address,
      });
    });

    // send workbook
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=employees_export.xlsx'
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('EXPORT DATA error:', err);
    res.status(500).json({ message: 'Failed to export employees', error: err.message });
  }
};
