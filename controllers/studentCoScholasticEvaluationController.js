// controllers/studentCoScholasticEvaluationController.js
const {
  Student,
  CoScholasticArea,
  CoScholasticGrade,
  StudentCoScholasticEvaluation,
  Incharge,
  Class,
  Section,
  ClassCoScholasticArea,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");
const ExcelJS = require("exceljs");

/* ---------------------------------------
   Helpers
---------------------------------------- */
const getReqUser = (req) => req.authUser || req.user || null;
const getReqRoles = (user) =>
  Array.isArray(user?.roles) ? user.roles.map((r) => r.slug || r) : [];

/* =========================================================
   GET: Students & Areas for Evaluation Entry
   GET /co-scholastic/evaluations?class_id=&section_id=&term_id=
========================================================= */
exports.getEvaluations = async (req, res) => {
  try {
    const { class_id, section_id, term_id } = req.query;
    const user = getReqUser(req);
    const userId = user?.id;
    const userRoles = getReqRoles(user);

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!class_id || !section_id || !term_id) {
      return res
        .status(400)
        .json({ message: "class_id, section_id, and term_id are required" });
    }

    // If not admin/superadmin, ensure teacher is incharge of class-section
    if (!userRoles.includes("admin") && !userRoles.includes("superadmin")) {
      const isAssigned = await Incharge.findOne({
        where: { teacherId: userId, classId: class_id, sectionId: section_id },
      });
      if (!isAssigned) {
        return res
          .status(403)
          .json({ message: "Not authorized for this class-section." });
      }
    }

    const students = await Student.findAll({
      where: {
        class_id,
        section_id,
        status: "enabled",
        visible: true,
        roll_number: { [Op.ne]: null },
      },
      order: [["roll_number", "ASC"]],
    });

    const areas = await CoScholasticArea.findAll({
      order: [["serial_order", "ASC"]],
    });

    const existing = await StudentCoScholasticEvaluation.findAll({
      where: { class_id, section_id, term_id },
    });

    res.json({ students, areas, existingEvaluations: existing });
  } catch (err) {
    console.error("🔥 Error in getEvaluations:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

/* =========================================================
   POST: Save or Update Evaluations (bulk upsert)
   POST /co-scholastic/evaluations
   { evaluations: [ { student_id, co_scholastic_area_id, grade_id, remarks, term_id, class_id, section_id } ] }
========================================================= */
exports.saveEvaluations = async (req, res) => {
  const { evaluations } = req.body;
  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    return res.status(400).json({ message: "evaluations array is required" });
  }

  const t = await sequelize.transaction();
  try {
    for (const ev of evaluations) {
      const {
        student_id,
        co_scholastic_area_id,
        grade_id,
        remarks,
        term_id,
        class_id,
        section_id,
      } = ev;

      if (!student_id || !co_scholastic_area_id || !term_id || !class_id || !section_id) {
        await t.rollback();
        return res.status(400).json({
          message:
            "Each evaluation must include student_id, co_scholastic_area_id, term_id, class_id, section_id",
        });
      }

      await StudentCoScholasticEvaluation.upsert(
        { student_id, co_scholastic_area_id, grade_id, remarks, term_id, class_id, section_id },
        { transaction: t }
      );
    }

    await t.commit();
    res.json({ message: "Evaluations saved successfully" });
  } catch (err) {
    await t.rollback();
    console.error("🔥 Error in saveEvaluations:", err);
    res.status(500).json({ message: "Failed to save evaluations", error: err.message });
  }
};

/* =========================================================
   GET: Export Evaluations Excel Template
   GET /co-scholastic/evaluations/export?class_id=&section_id=&term_id=
========================================================= */
exports.exportEvaluations = async (req, res) => {
  try {
    const { class_id, section_id, term_id } = req.query;

    if (!class_id || !section_id || !term_id) {
      return res
        .status(400)
        .json({ message: "class_id, section_id, and term_id are required" });
    }

    // Students
    const students = await Student.findAll({
      where: {
        class_id,
        section_id,
        status: "enabled",
        visible: true,
        roll_number: { [Op.ne]: null },
      },
      order: [["roll_number", "ASC"]],
    });

    // Areas
    const areas = await CoScholasticArea.findAll({
      order: [["serial_order", "ASC"]],
    });

    // Existing evaluations
    const existing = await StudentCoScholasticEvaluation.findAll({
      where: { class_id, section_id, term_id },
    });

    // Grades
    const grades = await CoScholasticGrade.findAll({
      order: [["order", "ASC"]],
      where: { is_active: true },
    });

    // gradeId -> "A/B/..."
    const gradeIdToLabel = {};
    grades.forEach((g) => (gradeIdToLabel[g.id] = g.grade));

    // Map: "studentId_areaId" -> { grade, remarks }
    const evalMap = {};
    existing.forEach((e) => {
      evalMap[`${e.student_id}_${e.co_scholastic_area_id}`] = {
        grade: gradeIdToLabel[e.grade_id] || "",
        remarks: e.remarks || "",
      };
    });

    const workbook = new ExcelJS.Workbook();

    // Hidden dropdown sheet
    const gradeSheet = workbook.addWorksheet("GradeOptions", { state: "veryHidden" });
    grades.forEach((g, idx) => {
      gradeSheet.getCell(`A${idx + 1}`).value = g.grade;
    });

    // Main sheet
    const sheet = workbook.addWorksheet("Co-Scholastic Entry");

    // Header
    const header = ["Roll No", "Student Name"];
    areas.forEach((a) => {
      header.push(`${a.name} - Grade`, `${a.name} - Remarks`);
    });
    sheet.addRow(header);

    // Column widths based on header text
    sheet.columns.forEach((col, idx) => {
      const headerText = header[idx] || "";
      const minWidth = 15;
      const buffer = 5;
      col.width = Math.max(headerText.length + buffer, minWidth);
    });

    // Freeze top row & first 2 columns
    sheet.views = [{ state: "frozen", xSplit: 2, ySplit: 1 }];

    // Rows
    students.forEach((s) => {
      const row = [s.roll_number, s.name];
      areas.forEach((a) => {
        const key = `${s.id}_${a.id}`;
        const ev = evalMap[key] || {};
        row.push(ev.grade, ev.remarks);
      });
      sheet.addRow(row);
    });

    // Data validation for grade cells + unlock grade & remarks
    const gradeRange = `GradeOptions!$A$1:$A$${grades.length}`;
    for (let rowIndex = 2; rowIndex <= students.length + 1; rowIndex++) {
      let colIndex = 3; // first grade column
      for (let i = 0; i < areas.length; i++) {
        const cell = sheet.getCell(rowIndex, colIndex);
        const remarksCell = sheet.getCell(rowIndex, colIndex + 1);

        cell.dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`=${gradeRange}`],
          showDropDown: true,
          showErrorMessage: true,
          errorTitle: "Invalid Grade",
          error: "Please select a grade from the dropdown",
        };

        cell.protection = { locked: false };
        remarksCell.protection = { locked: false };

        colIndex += 2;
      }
    }

    // Protect sheet but allow unlocked cells to be edited
    await sheet.protect("coscholastic2025", {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatColumns: true,
    });

    // Send file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=coscholastic-${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("🔥 Error in exportEvaluations:", err);
    res.status(500).json({ message: "Failed to export Excel", error: err.message });
  }
};

/* =========================================================
   POST: Import Evaluations from Excel
   POST /co-scholastic/evaluations/import
   multipart/form-data: { file, class_id, section_id, term_id }
========================================================= */
exports.importEvaluations = async (req, res) => {
  const file = req.file;
  const { class_id, section_id, term_id } = req.body;

  if (!file) return res.status(400).json({ message: "No file uploaded" });
  if (!class_id || !section_id || !term_id) {
    return res
      .status(400)
      .json({ message: "class_id, section_id, and term_id are required" });
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file.path);
  const sheet = workbook.worksheets[0];
  if (!sheet) return res.status(400).json({ message: "Uploaded file has no sheet" });

  const areas = await CoScholasticArea.findAll({ order: [["serial_order", "ASC"]] });

  // "A", "B" -> grade_id
  const gradeLabelToId = {};
  const grades = await CoScholasticGrade.findAll({ where: { is_active: true } });
  grades.forEach((g) => {
    if (g.grade) gradeLabelToId[g.grade.toUpperCase()] = g.id;
  });

  const t = await sequelize.transaction();
  try {
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const rollNo = row.getCell(1).value;
      if (!rollNo) continue;

      const student = await Student.findOne({
        where: { roll_number: rollNo, class_id, section_id },
      });
      if (!student) continue;

      let col = 3; // first grade column
      for (const area of areas) {
        const gradeStr = (row.getCell(col++).value ?? "").toString().trim().toUpperCase();
        const remarks = (row.getCell(col++).value ?? "").toString().trim();

        if (!gradeStr) continue;
        const grade_id = gradeLabelToId[gradeStr];
        if (!grade_id) continue;

        await StudentCoScholasticEvaluation.upsert(
          {
            student_id: student.id,
            co_scholastic_area_id: area.id,
            grade_id,
            remarks,
            term_id,
            class_id,
            section_id,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();
    res.json({ message: "Evaluations imported successfully" });
  } catch (err) {
    await t.rollback();
    console.error("🔥 Error in importEvaluations:", err);
    res.status(500).json({ message: "Failed to import evaluations", error: err.message });
  }
};

/* =========================================================
   POST: Lock Evaluations (class-section-term)
   POST /co-scholastic/evaluations/lock
========================================================= */
exports.lockEvaluations = async (req, res) => {
  const { class_id, section_id, term_id } = req.body;
  try {
    if (!class_id || !section_id || !term_id) {
      return res
        .status(400)
        .json({ message: "class_id, section_id, and term_id are required" });
    }

    await StudentCoScholasticEvaluation.update(
      { locked: true },
      { where: { class_id, section_id, term_id } }
    );

    res.json({ message: "Evaluations locked successfully" });
  } catch (err) {
    console.error("🔥 Error in lockEvaluations:", err);
    res.status(500).json({ message: "Failed to lock evaluations", error: err.message });
  }
};

/* =========================================================
   GET: Assigned Classes (class-section pairs) for a Teacher
   GET /co-scholastic/assigned-classes
========================================================= */
exports.getAssignedClasses = async (req, res) => {
  try {
    const teacherId = getReqUser(req)?.id;
    if (!teacherId) return res.status(401).json({ message: "Unauthorized" });

    // All incharge assignments for this teacher
    const inchargeAssignments = await Incharge.findAll({
      where: { teacherId },
      include: [{ model: Class }, { model: Section }],
    });

    // Only return classes that have co-scholastic mapping
    const classCoScholastic = await ClassCoScholasticArea.findAll({
      attributes: ["class_id"],
      group: ["class_id"],
      raw: true,
    });
    const validClassIds = new Set(classCoScholastic.map((r) => r.class_id));

    const result = inchargeAssignments
      .filter((entry) => entry.Class && entry.Section && validClassIds.has(entry.classId))
      .map((entry) => ({
        class_id: entry.classId,
        section_id: entry.sectionId,
        class_name: entry.Class.class_name,
        section_name: entry.Section.section_name,
        label: `${entry.Class.class_name} - ${entry.Section.section_name}`,
      }));

    res.json(result);
  } catch (err) {
    console.error("🔥 Error in getAssignedClasses:", err);
    res.status(500).json({ message: "Failed to fetch assigned classes", error: err.message });
  }
};

/* =========================================================
   GET: Co-Scholastic Areas for a Class (optional term)
   GET /class-co-scholastic-areas?class_id=&term_id=
   ⚠️ Requires association: ClassCoScholasticArea.belongsTo(CoScholasticArea, { as: 'area', foreignKey: 'co_scholastic_area_id' })
========================================================= */
exports.getCoScholasticAreas = async (req, res) => {
  try {
    const { class_id, term_id } = req.query;

    if (!class_id) {
      return res
        .status(400)
        .json({ message: "class_id is required (e.g. ?class_id=6)" });
    }

    // Build where clause. Keep term_id ONLY if that column exists in your schema.
    const where = { class_id };
    if (term_id) where.term_id = term_id;

    const mappings = await ClassCoScholasticArea.findAll({
      where,
      include: [
        {
          model: CoScholasticArea,
          as: "area", // must match the association alias
          attributes: ["id", "name", "serial_order"],
        },
      ],
      order: [[{ model: CoScholasticArea, as: "area" }, "serial_order", "ASC"]],
    });

    const areas = mappings
      .filter((m) => m.area) // guard in case any mapping lacks related area
      .map((m) => ({ id: m.area.id, name: m.area.name }));

    res.json(areas);
  } catch (err) {
    console.error("🔥 Error in getCoScholasticAreas:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch co-scholastic areas", error: err.message });
  }
};
