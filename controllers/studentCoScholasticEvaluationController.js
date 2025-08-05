const {
  Student,
  CoScholasticArea,
  GradeScheme,
  StudentCoScholasticEvaluation,
  Incharge,
  Class,
  Section,
  ClassCoScholasticArea,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");
const ExcelJS = require("exceljs");
const fs = require("fs");

// ✅ Get students & areas for evaluation entry
exports.getEvaluations = async (req, res) => {
  try {
    const { class_id, section_id, term_id } = req.query;
    const userId = req.user
?.id;
    const userRoles = (req.user
?.roles || []).map((r) => r.slug);

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    if (!userRoles.includes("admin") && !userRoles.includes("superadmin")) {
      const isAssigned = await Incharge.findOne({
        where: { teacherId: userId, classId: class_id, sectionId: section_id },
      });
      if (!isAssigned) {
        return res.status(403).json({ message: "Not authorized for this class-section." });
      }
    }

    const students = await Student.findAll({
      where: { class_id, section_id, status: "enabled", visible: true, roll_number: { [Op.ne]: null } },
      order: [["roll_number", "ASC"]],
    });

    const areas = await CoScholasticArea.findAll({ order: [["serial_order", "ASC"]] });

    const existing = await StudentCoScholasticEvaluation.findAll({
      where: { class_id, section_id, term_id },
    });

    res.json({ students, areas, existingEvaluations: existing });
  } catch (err) {
    console.error("🔥 Error in getEvaluations:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Save or update evaluations
exports.saveEvaluations = async (req, res) => {
  const { evaluations } = req.body;
  const t = await sequelize.transaction();

  try {
    for (const ev of evaluations) {
      const { student_id, co_scholastic_area_id, grade_id, remarks, term_id, class_id, section_id } = ev;

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
    res.status(500).json({ message: "Failed to save evaluations" });
  }
};

// ✅ Export evaluations Excel template
exports.exportEvaluations = async (req, res) => {
  try {
    const { class_id, section_id, term_id } = req.query;

    const students = await Student.findAll({
      where: { class_id, section_id, status: "enabled", visible: true, roll_number: { [Op.ne]: null } },
      order: [["roll_number", "ASC"]],
    });

    const areas = await CoScholasticArea.findAll({ order: [["serial_order", "ASC"]] });

    const existing = await StudentCoScholasticEvaluation.findAll({
      where: { class_id, section_id, term_id },
    });

    const gradeMap = {};
    const grades = await GradeScheme.findAll();
    grades.forEach((g) => (gradeMap[g.id] = g.grade));

    const evalMap = {};
    existing.forEach((e) => {
      evalMap[`${e.student_id}_${e.co_scholastic_area_id}`] = {
        grade: gradeMap[e.grade_id] || "",
        remarks: e.remarks || "",
      };
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Co-Scholastic Entry");

    const header = ["Roll No", "Student Name"];
    areas.forEach((a) => {
      header.push(`${a.name} - Grade`, `${a.name} - Remarks`);
    });
    sheet.addRow(header);

    students.forEach((s) => {
      const row = [s.roll_number, s.name];
      areas.forEach((a) => {
        const key = `${s.id}_${a.id}`;
        const ev = evalMap[key] || {};
        row.push(ev.grade, ev.remarks);
      });
      sheet.addRow(row);
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=coscholastic-${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("🔥 Error in exportEvaluations:", err);
    res.status(500).json({ message: "Failed to export Excel" });
  }
};

// ✅ Import evaluations from Excel
exports.importEvaluations = async (req, res) => {
  const file = req.file;
  const { class_id, section_id, term_id } = req.body;
  if (!file) return res.status(400).json({ message: "No file uploaded" });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file.path);
  const sheet = workbook.worksheets[0];

  const areas = await CoScholasticArea.findAll({ order: [["serial_order", "ASC"]] });
  const gradeMap = {};
  const grades = await GradeScheme.findAll();
  grades.forEach((g) => (gradeMap[g.grade.toUpperCase()] = g.id));

  const t = await sequelize.transaction();
  try {
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const rollNo = row.getCell(1).value;
      if (!rollNo) continue;

      const student = await Student.findOne({ where: { roll_number: rollNo, class_id, section_id } });
      if (!student) continue;

      let col = 3;
      for (const area of areas) {
        const gradeStr = row.getCell(col++).value?.toString().trim().toUpperCase() || "";
        const remarks = row.getCell(col++).value?.toString().trim() || "";

        if (!gradeStr) continue;
        const grade_id = gradeMap[gradeStr];
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
    res.status(500).json({ message: "Failed to import evaluations" });
  }
};

// ✅ Lock evaluations
exports.lockEvaluations = async (req, res) => {
  const { class_id, section_id, term_id } = req.body;
  try {
    await StudentCoScholasticEvaluation.update(
      { locked: true },
      {
        where: { class_id, section_id, term_id },
      }
    );
    res.json({ message: "Evaluations locked successfully" });
  } catch (err) {
    console.error("🔥 Error in lockEvaluations:", err);
    res.status(500).json({ message: "Failed to lock evaluations" });
  }
};

// ✅ Assigned Classes with Co-Scholastic Mapping
exports.getAssignedClasses = async (req, res) => {
  console.log("🔍 req.user:", req.user);

  try {
    const teacherId = req.user?.id;
    if (!teacherId) return res.status(401).json({ message: "Unauthorized" });

    // Step 1: Get class-section incharge assignments for this teacher
    const inchargeAssignments = await Incharge.findAll({
      where: { teacherId },
      include: [
        { model: Class },   // No alias required
        { model: Section }, // No alias required
      ],
    });

    // Step 2: Fetch all class_ids from ClassCoScholasticArea
    const classCoScholastic = await ClassCoScholasticArea.findAll({
      attributes: ["class_id"],
      group: ["class_id"],
      raw: true,
    });

    const validClassIds = new Set(classCoScholastic.map((item) => item.class_id));

    // Step 3: Filter and return only valid class-section pairs
    const result = inchargeAssignments
      .filter(entry => {
        return (
          entry.Class &&
          entry.Section &&
          validClassIds.has(entry.classId)
        );
      })
      .map(entry => ({
        class_id: entry.classId,
        section_id: entry.sectionId,
        class_name: entry.Class.class_name,
        section_name: entry.Section.section_name,
        label: `${entry.Class.class_name} - ${entry.Section.section_name}`
      }));

    res.json(result);
  } catch (err) {
    console.error("🔥 Error in getAssignedClasses:", err);
    res.status(500).json({ message: "Failed to fetch assigned classes" });
  }
};


// ✅ Get Co-Scholastic Areas for a class (and optional term)
exports.getCoScholasticAreas = async (req, res) => {
  try {
    const { class_id, term_id } = req.query;

    if (!class_id) {
      return res.status(400).json({ message: "class_id is required" });
    }

    const whereClause = { class_id };
    if (term_id) whereClause.term_id = term_id;

    const mappings = await ClassCoScholasticArea.findAll({
      where: whereClause,
      include: [
        {
          model: CoScholasticArea,
          as: "area",
          attributes: ["id", "name", "serial_order"],
        },
      ],
      order: [[{ model: CoScholasticArea, as: "area" }, "serial_order", "ASC"]],
    });

    const areas = mappings.map((m) => ({
      id: m.area.id,
      name: m.area.name,
    }));

    res.json(areas);
  } catch (err) {
    console.error("🔥 Error in getCoScholasticAreas:", err);
    res.status(500).json({ message: "Failed to fetch co-scholastic areas" });
  }
};
