const {
  Student,
  StudentExamResult,
  ExamSchedule,
  AssessmentComponent,
  ExamScheme,
  Incharge,
  Subject,
  sequelize,
} = require("../models");

const { Op } = require("sequelize");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

// ==========================================
// ✅ Get students & components for marks entry
// ==========================================
exports.getMarksEntryData = async (req, res) => {
  try {
    const { exam_id, class_id, section_id, subject_id } = req.query;
    const userId = req.user.id;
    const userRoles = (req.user.roles || []).map((r) => r.slug);

    if (!userRoles.includes("admin") && !userRoles.includes("superadmin")) {
      const isAssigned = await Incharge.findOne({
        where: {
          teacherId: userId,
          classId: class_id,
          sectionId: section_id,
        },
      });

      if (!isAssigned) {
        return res.status(403).json({
          message: "You are not authorized to access this class-section's marks entry.",
        });
      }
    }

    const schedule = await ExamSchedule.findOne({
      where: { exam_id, class_id, section_id, subject_id },
    });

    if (!schedule || !schedule.term_id) {
      return res.status(404).json({ message: "No exam schedule or term found." });
    }

    const schemeEntries = await ExamScheme.findAll({
      where: {
        class_id,
        subject_id,
        term_id: schedule.term_id,
      },
      include: [{ model: AssessmentComponent, as: "component" }],
      order: [["serial_order", "ASC"]],
    });

      const components = schemeEntries.map((entry) => ({
        exam_scheme_id: entry.id, // Needed for lock/unlock
        component_id: entry.component.id,
        name: entry.component.name,
        abbreviation: entry.component.abbreviation,
        max_marks: entry.component.max_marks,
        is_locked: entry.is_locked,
      }));



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

    const results = await StudentExamResult.findAll({
      where: { exam_schedule_id: schedule.id },
    });

    res.json({
      exam_schedule_id: schedule.id,
      students,
      components,
      existingResults: results,
    });
  } catch (err) {
    console.error("🔥 Error in getMarksEntryData:", err.message, err.stack);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// ==========================================
// ✅ Save or update marks for students
// ==========================================
exports.saveMarksEntry = async (req, res) => {
  const { exam_schedule_id, marksData } = req.body;

  const t = await sequelize.transaction();
  try {
    for (const entry of marksData) {
      const {
        student_id,
        component_id,
        marks_obtained,
        grade,
        remarks,
        attendance = "P", // Default to 'P'
      } = entry;

      await StudentExamResult.upsert(
        {
          student_id,
          exam_schedule_id,
          component_id,
          marks_obtained: attendance === "P" ? marks_obtained : null,
          grade,
          remarks,
          attendance,
        },
        { transaction: t }
      );
    }

    await t.commit();
    res.json({ message: "Marks saved successfully" });
  } catch (err) {
    await t.rollback();
    console.error("🔥 Error in saveMarksEntry:", err.message, err.stack);
    res.status(500).json({ message: "Failed to save marks", error: err.message });
  }
};

// ==========================================
// ✅ Export Marks Entry Template
// ==========================================
exports.exportMarksEntryExcel = async (req, res) => {
  try {
    const { exam_id, class_id, section_id, subject_id } = req.query;

    const schedule = await ExamSchedule.findOne({
      where: { exam_id, class_id, section_id, subject_id },
    });

    if (!schedule || !schedule.term_id) {
      return res.status(404).json({ message: "No exam schedule or term found." });
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

    const schemeEntries = await ExamScheme.findAll({
      where: { class_id, subject_id, term_id: schedule.term_id },
      include: [{ model: AssessmentComponent, as: "component" }],
      order: [["serial_order", "ASC"]],
    });

    const existingResults = await StudentExamResult.findAll({
      where: {
        exam_schedule_id: schedule.id,
        student_id: { [Op.in]: students.map(s => s.id) },
      },
    });

    // 🔁 Map results for quick lookup
    const resultMap = {};
    existingResults.forEach(result => {
      const key = `${result.student_id}_${result.component_id}`;
      resultMap[key] = {
        marks: result.marks_obtained,
        attendance: result.attendance || "P",
      };
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Marks Entry");

    // 🔹 Header Row 1: Component titles
    const headerRow1 = ["Roll No", "Student Name"];
    schemeEntries.forEach(entry => {
      headerRow1.push(`${entry.component.abbreviation}`);
      headerRow1.push("");
    });
    sheet.addRow(headerRow1);

    // 🔹 Header Row 2: Sub-columns
    const headerRow2 = ["", ""];
    schemeEntries.forEach(entry => {
      headerRow2.push("Attendance");
      headerRow2.push(`Marks (out of ${entry.component.max_marks})`);
    });
    sheet.addRow(headerRow2);

    // 🔹 Set column widths
    const columns = [
      { key: "roll", width: 12 },
      { key: "name", width: 30 },
    ];
    schemeEntries.forEach(() => {
      columns.push({ width: 15 });
      columns.push({ width: 20 });
    });
    sheet.columns = columns;

    // 🔹 Add student rows (prefilled)
    students.forEach(student => {
      const row = [student.roll_number, student.name];
      schemeEntries.forEach(entry => {
        const key = `${student.id}_${entry.component_id}`;
        const result = resultMap[key] || {};
        row.push(result.attendance || "P");
        row.push(result.marks != null ? result.marks : "");
      });
      sheet.addRow(row);
    });

    // 🔹 Attendance dropdown options
    const attendanceOptions = ["P", "A", "L", "ACT", "LA", "ML", "X"];

    // 🔹 Apply protection and validation
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (rowNumber <= 2) {
          cell.font = { bold: true };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }

        if (colNumber <= 2) {
          cell.protection = { locked: true };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD9D9D9" },
          };
        } else {
          const compIndex = Math.floor((colNumber - 3) / 2);
          const isAttendanceCol = (colNumber - 3) % 2 === 0;
          const component = schemeEntries[compIndex]?.component;

          if (rowNumber > 2) {
            if (isAttendanceCol) {
              cell.dataValidation = {
                type: "list",
                allowBlank: false,
                formulae: [`"${attendanceOptions.join(",")}"`],
                showErrorMessage: true,
                errorTitle: "Invalid Attendance",
                error: "Select from dropdown only",
              };
              cell.protection = { locked: false };
            } else {
              cell.dataValidation = {
                type: "decimal",
                operator: "between",
                formulae: [0, component?.max_marks || 100],
                showErrorMessage: true,
                errorTitle: "Invalid Marks",
                error: `Marks must be between 0 and ${component?.max_marks}`,
              };
              cell.protection = { locked: false };
            }
          }
        }
      });
    });

    // 🔹 Merge header cells
    sheet.mergeCells(1, 1, 2, 1); // Roll No
    sheet.mergeCells(1, 2, 2, 2); // Name
    for (let i = 0; i < schemeEntries.length; i++) {
      const startCol = 3 + i * 2;
      sheet.mergeCells(1, startCol, 1, startCol + 1);
    }

    // 🔒 Protect sheet
    await sheet.protect("admin123", {
      selectLockedCells: true,
      selectUnlockedCells: true,
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=marks-entry-${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("🔥 Error in exportMarksEntryExcel:", err.message);
    res.status(500).json({ message: "Failed to export Excel", error: err.message });
  }
};


// ==========================================
// ✅ Import Marks from Excel (with Attendance check)
// ==========================================
exports.importMarksEntryExcel = async (req, res) => {
  const file = req.file;
  const { exam_schedule_id } = req.body;

  if (!file) return res.status(400).json({ message: "No file uploaded" });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file.path);
  const sheet = workbook.worksheets[0];

  // ✅ Parse Header Row 1 & Row 2
  const headerRow1 = sheet.getRow(1).values.slice(1); // remove first empty
  const headerRow2 = sheet.getRow(2).values.slice(1);

  // ✅ Build Component Map: { abbreviation, attendanceCol, marksCol }
  const componentMap = [];
  for (let i = 2; i < headerRow1.length; i += 2) {
    const abbrev = headerRow1[i];
    if (!abbrev) continue;

    componentMap.push({
      abbreviation: abbrev,
      attendanceCol: i + 1, // ExcelJS is 1-based
      marksCol: i + 2,
    });
  }

  const schedule = await ExamSchedule.findByPk(exam_schedule_id);
  if (!schedule) return res.status(400).json({ message: "Invalid exam schedule ID" });

  const { class_id, subject_id, term_id } = schedule;

  const t = await sequelize.transaction();
  try {
    for (let i = 3; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const rollNo = row.getCell(1).value;

      if (!rollNo) continue;

      const student = await Student.findOne({ where: { roll_number: rollNo } });
      if (!student) continue;

      for (const comp of componentMap) {
        const attendanceRaw = row.getCell(comp.attendanceCol).value || "P";
        const attendance = attendanceRaw.toString().trim();

        const marksRaw = row.getCell(comp.marksCol).value;
        const marks = attendance === "P" ? parseFloat(marksRaw) : null;

        const component = await AssessmentComponent.findOne({
          where: { abbreviation: comp.abbreviation },
        });
        if (!component) continue;

        // 🔐 Check if this component is locked for this class, subject, and term
        const examScheme = await sequelize.models.ExamScheme.findOne({
          where: {
            component_id: component.id,
            class_id,
            subject_id,
            term_id,
          },
        });

        if (examScheme?.is_locked) {
          await t.rollback();
          return res.status(400).json({
            error: `Component "${component.abbreviation}" is locked and cannot accept imported marks.`,
          });
        }

        await StudentExamResult.upsert(
          {
            student_id: student.id,
            exam_schedule_id,
            component_id: component.id,
            marks_obtained: isNaN(marks) ? null : marks,
            attendance,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();
    res.json({ message: "Marks imported successfully" });
  } catch (err) {
    await t.rollback();
    console.error("🔥 Error in importMarksEntryExcel:", err.message);
    res.status(500).json({ message: "Failed to import marks", error: err.message });
  }
};


// ==========================================
// ✅ Get Detailed Summary Report with Percent Buckets (Component + Total)
// ==========================================
exports.getReportSummary = async (req, res) => {
  try {
    const {
      class_id,
      section_id,
      exam_id,
      subjectComponents = [],
      sum,
      showSubjectTotals,
      includeGrades,
    } = req.body;

    if (!class_id || !section_id || !exam_id || subjectComponents.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const includeGradesBool = includeGrades === true || includeGrades === "true";

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

    const gradeSchemes = await sequelize.models.GradeScheme.findAll({
      order: [["min_percent", "DESC"]],
    });

    const allStudentData = [];
    const summary = {
      components: {},
      total: {
        "100": 0,
        "90-99": 0,
        "80-89": 0,
        "70-79": 0,
        "60-69": 0,
        "50-59": 0,
        "0-49": 0,
      },
    };
    const subjectComponentGroups = [];
    const componentMapBySubject = {};

    for (const group of subjectComponents) {
      const { subject_id, component_ids } = group;
      if (subjectComponentGroups.find((g) => g.subject_id === subject_id)) continue;

      const schedule = await ExamSchedule.findOne({
        where: { class_id, section_id, exam_id, subject_id },
      });
      if (!schedule || !schedule.term_id) continue;

      const subject = await Subject.findByPk(subject_id);
      const schemeEntries = await ExamScheme.findAll({
        where: { class_id, subject_id, term_id: schedule.term_id },
        include: [{ model: AssessmentComponent, as: "component" }],
        order: [["serial_order", "ASC"]],
      });

      const selectedComponents = component_ids?.length
        ? schemeEntries.filter((e) => component_ids.includes(e.component_id))
        : [];

      componentMapBySubject[subject_id] = selectedComponents;

      const groupTotalWeightage = selectedComponents.reduce(
        (sum, c) => sum + (c.weightage_percent || 0),
        0
      );

      subjectComponentGroups.push({
        subject_id,
        subject_name: subject.name,
        total_weightage: groupTotalWeightage,
        components: selectedComponents.map((c) => ({
          component_id: c.component_id,
          name: c.component.abbreviation || c.component.name,
          weightage_percent: c.weightage_percent || 0,
        })),
      });

      const results = await StudentExamResult.findAll({
        where: { exam_schedule_id: schedule.id },
      });

      for (const comp of selectedComponents) {
        const max = comp.component.max_marks || 100;
        const key = `${comp.component.abbreviation || comp.component.name} (${subject_id})`;
        summary.components[key] = getEmptyBuckets(max);
      }

      for (const student of students) {
        let stuObj = allStudentData.find((s) => s.id === student.id);
        if (!stuObj) {
          stuObj = {
            id: student.id,
            name: student.name,
            roll_number: student.roll_number,
            components: [],
            subject_totals_raw: {},
            subject_totals_weighted: {},
            subject_grades: {},
            total_raw: 0,
            total_weighted: 0,
          };
          allStudentData.push(stuObj);
        }

        let rawTotal = 0,
            weightedTotal = 0;
        for (const comp of selectedComponents) {
          const resEntry =
            results.find(
              (r) =>
                r.student_id === student.id && r.component_id === comp.component_id
            ) || {};
          const marks = resEntry.marks_obtained ?? null;
          const attendance = resEntry.attendance || "P";
          const weightage = comp.weightage_percent || 0;
          const max = comp.component.max_marks || 100;
          const key = `${comp.component.abbreviation || comp.component.name} (${subject_id})`;

          const weighted_marks =
            marks != null && attendance === "P"
              ? parseFloat(((marks / max) * weightage).toFixed(2))
              : null;

          const percent =
            marks != null && attendance === "P" ? (marks / max) * 100 : null;
          if (percent != null) {
            const bucket = getBucket(percent);
            summary.components[key][bucket]++;
          }

          if (marks != null && attendance === "P") {
            rawTotal += marks;
            weightedTotal += weighted_marks;
          }

          stuObj.components.push({
            component_id: comp.component_id,
            subject_id,
            name: key,
            marks,
            weighted_marks,
            attendance,
            weightage_percent: weightage,
            grade: percent != null ? getGrade(percent, gradeSchemes) : null,
            weighted_grade:
              weighted_marks != null
                ? getGrade((weighted_marks / weightage) * 100, gradeSchemes)
                : null,
          });
        }

        if (selectedComponents.length > 0) {
          stuObj.subject_totals_raw[subject_id] = rawTotal;
          stuObj.subject_totals_weighted[subject_id] = weightedTotal;
          if (includeGradesBool) {
            const maxRaw = selectedComponents.reduce(
              (acc, c) => acc + (c.component.max_marks || 100),
              0
            );
            const grade =
              maxRaw > 0 ? getGrade((rawTotal / maxRaw) * 100, gradeSchemes) : null;
            stuObj.subject_grades[subject_id] = grade;
          }
        }
      }
    }

    let grandRaw = 0,
        grandRawMax = 0,
        grandWeighted = 0,
        grandWeightMax = 0;
    const subjectIds = subjectComponents.map((sc) => parseInt(sc.subject_id, 10));
    for (const stu of allStudentData) {
      let sumRaw = 0,
          sumWeighted = 0;
      let maxRaw = 0,
          maxWeight = 0;

      for (const sid of subjectIds) {
        const comps = componentMapBySubject[sid] || [];
        sumRaw += stu.subject_totals_raw[sid] || 0;
        sumWeighted += stu.subject_totals_weighted[sid] || 0;
        for (const c of comps) {
          maxRaw += c.component.max_marks || 100;
          maxWeight += c.weightage_percent || 0;
        }
      }

      stu.total_raw = sumRaw;
      stu.total_weighted = sumWeighted;
      grandRaw += sumRaw;
      grandRawMax += maxRaw;
      grandWeighted += sumWeighted;
      grandWeightMax += maxWeight;

      if (includeGradesBool) {
        stu.grand_percent_raw =
          maxRaw > 0 ? parseFloat(((sumRaw / maxRaw) * 100).toFixed(2)) : null;
        stu.grand_percent_weighted =
          maxWeight > 0 ? parseFloat(((sumWeighted / maxWeight) * 100).toFixed(2)) : null;

        stu.total_grade_raw =
          maxRaw > 0 ? getGrade((sumRaw / maxRaw) * 100, gradeSchemes) : null;
        stu.total_grade_weighted =
          maxWeight > 0 ? getGrade((sumWeighted / maxWeight) * 100, gradeSchemes) : null;
      }

      if (sum) {
        const b = getBucket((sumWeighted / maxWeight) * 100);
        summary.total[b]++;
      }
    }

    const count = allStudentData.length;
    summary.grand_total_raw =
      count > 0 ? parseFloat((grandRaw / count).toFixed(2)) : 0;
    summary.grand_total_weighted =
      count > 0 ? parseFloat((grandWeighted / count).toFixed(2)) : 0;

    // ✅ Add grand percentage and grade
    if (includeGradesBool) {
      const pr = grandRawMax > 0 ? (grandRaw / grandRawMax) * 100 : null;
      const pw = grandWeightMax > 0 ? (grandWeighted / grandWeightMax) * 100 : null;

      summary.grand_percent_raw = pr != null ? parseFloat(pr.toFixed(2)) : null;
      summary.grand_percent_weighted = pw != null ? parseFloat(pw.toFixed(2)) : null;

      summary.grand_total_grade_raw = pr != null ? getGrade(pr, gradeSchemes) : null;
      summary.grand_total_grade_weighted = pw != null ? getGrade(pw, gradeSchemes) : null;
    }

    const total_weightage = subjectComponentGroups.reduce(
      (sum, g) => sum + (g.total_weightage || 0),
      0
    );

    return res.json({
      students: allStudentData,
      summary,
      subjectComponentGroups,
      total_weightage,
    });
  } catch (err) {
    console.error("🔥 Error in getReportSummary:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};


// Helper functions
function getBucket(percent) {
  if (percent === 100) return "100";
  else if (percent >= 90) return "90-99";
  else if (percent >= 80) return "80-89";
  else if (percent >= 70) return "70-79";
  else if (percent >= 60) return "60-69";
  else if (percent >= 50) return "50-59";
  else return "0-49";
}

function getGrade(percent, gradeSchemes) {
  const rounded = Math.round(percent * 1000) / 1000;
  for (const scheme of gradeSchemes) {
    const min = parseFloat(scheme.min_percent);
    const max = parseFloat(scheme.max_percent);
    if (rounded >= min && rounded <= max) {
      return scheme.grade;
    }
  }
  return null;
}

function getEmptyBuckets(max_marks = 100) {
  return {
    max_marks,
    "100": 0,
    "90-99": 0,
    "80-89": 0,
    "70-79": 0,
    "60-69": 0,
    "50-59": 0,
    "0-49": 0,
  };
}





