const { Op } = require("sequelize");
const {
  sequelize,  
  Student,
  Subject,
  ExamSchedule,
  ExamScheme,
  Exam,
  AssessmentComponent,
  StudentExamResult,
  GradeScheme,
  Incharge,
  Class,
  Section,
  ClassCoScholasticArea,
  CoScholasticArea,
  StudentCoScholasticEvaluation, // ✅ ADD THIS
  CoScholasticGrade,              // ✅ AND THIS
  StudentRemark,
  Attendance,
  Term,
  ReportCardFormatClass, 
  ReportCardFormat
} = require("../models");

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const handlebars = require("handlebars");


// ✅ GET /report-card/students
exports.getReportCardStudents = async (req, res) => {
  try {
    let { class_id, section_id, student_ids = [] } = req.query;
    const userId = req.user.id;

    // 🔁 Auto-detect class-section if not passed
    if (!class_id || !section_id) {
      const assigned = await Incharge.findOne({
        where: { teacherId: userId },
      });

      if (!assigned) {
        return res.status(400).json({ message: "Class/Section not provided and you're not an incharge." });
      }

      class_id = assigned.classId;
      section_id = assigned.sectionId;
    }

    // 🔐 Check incharge permission
    const isIncharge = await Incharge.findOne({
      where: {
        classId: class_id,
        sectionId: section_id,
        teacherId: userId,
      },
    });

    if (!isIncharge) {
      return res.status(403).json({ message: "Access denied. You are not the incharge of this class-section." });
    }

    const students = await Student.findAll({
      where: {
        class_id,
        section_id,
        status: "enabled",
        visible: true,
        roll_number: { [Op.ne]: null },
        ...(student_ids.length > 0 && { id: { [Op.in]: student_ids } }),
      },
      order: [["roll_number", "ASC"]],
      include: [
        { model: Class, as: "Class", attributes: ["class_name"] },
        { model: Section, as: "Section", attributes: ["section_name"] },
      ],
    });

    return res.status(200).json({ students });
  } catch (error) {
    console.error("Error in getReportCardStudents:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};

// ✅ POST /report-card/scholastic-summary
exports.getScholasticSummary = async (req, res) => {
  try {
    let {
      class_id,
      section_id,
      exam_ids, // ✅ now expecting an array
      subjectComponents,
      grade_scheme_id,
      student_ids = [],
    } = req.body;

    const userId = req.user.id;

    // 🔁 Auto-detect class/section for incharge
    if (!class_id || !section_id) {
      const assigned = await Incharge.findOne({
        where: { teacherId: userId },
      });

      if (!assigned) {
        return res.status(400).json({
          message: "Class/Section not provided and you're not an incharge.",
        });
      }

      class_id = assigned.classId;
      section_id = assigned.sectionId;
    }

    // 🔐 Check if this incharge is allowed
    const isIncharge = await Incharge.findOne({
      where: {
        classId: class_id,
        sectionId: section_id,
        teacherId: userId,
      },
    });

    if (!isIncharge) {
      return res.status(403).json({
        message: "You are not incharge of this class-section.",
      });
    }

    // ✅ Validate exam_ids array
    if (!Array.isArray(exam_ids) || exam_ids.length === 0) {
      return res.status(400).json({ message: "exam_ids must be a non-empty array." });
    }

    // ✅ Call summary logic with exam_ids
    const data = await getScholasticSummaryForReportCard({
      class_id,
      section_id,
      exam_ids, // ✅ pass array
      subjectComponents,
      gradeSchemeId: grade_scheme_id,
      student_ids,
    });

    return res.json(data);
  } catch (error) {
    console.error("🔥 Error in getScholasticSummary:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};



// ✅ Get Co-Scholastic Grades per Student
exports.getCoScholasticGradesForStudents = async (req, res) => {
  try {
    const { class_id, section_id, term_id } = req.query;

    if (!class_id || !section_id || !term_id) {
      return res.status(400).json({ message: "class_id, section_id, and term_id are required" });
    }

    // ✅ Get students
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

    // ✅ Get areas
    const areas = await ClassCoScholasticArea.findAll({
      where: { class_id },
      include: [
        {
          model: CoScholasticArea,
          as: "area",
          attributes: ["id", "name", "serial_order"],
        },
      ],
      order: [[{ model: CoScholasticArea, as: "area" }, "serial_order", "ASC"]],
    });

    // ✅ Map area id to name
    const areaMap = {};
    areas.forEach((m) => {
      if (m.area) areaMap[m.area.id] = m.area.name;
    });

    // ✅ Get evaluations
    const evaluations = await StudentCoScholasticEvaluation.findAll({
      where: { class_id, section_id, term_id },
      include: [{ model: CoScholasticGrade }],
    });

    // ✅ Map evaluations by student_id
    const evalMap = {};
    evaluations.forEach((e) => {
      if (!evalMap[e.student_id]) evalMap[e.student_id] = {};
      evalMap[e.student_id][e.co_scholastic_area_id] = {
        grade: e.CoScholasticGrade?.grade || null,
        remarks: e.remarks || "",
      };
    });

    // ✅ Prepare final result
    const result = students.map((s) => {
      const studentData = {
        id: s.id,
        roll_number: s.roll_number,
        name: s.name,
        grades: [],
      };

      for (const [area_id, name] of Object.entries(areaMap)) {
        const evaluation = evalMap[s.id]?.[area_id] || {};
        studentData.grades.push({
          area_id: parseInt(area_id),
          area_name: name,
          grade: evaluation.grade || "-",
          remarks: evaluation.remarks || "",
        });
      }

      return studentData;
    });

    res.json(result);
  } catch (err) {
    console.error("🔥 Error in getCoScholasticGradesForStudents:", err);
    res.status(500).json({ message: "Failed to fetch grades" });
  }
};

exports.getRemarksSummary = async (req, res) => {
  try {
    const { class_id, section_id, term_id, student_ids = [] } = req.query;

    if (!class_id || !section_id || !term_id) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const remarks = await StudentRemark.findAll({
      where: {
        class_id,
        section_id,
        term_id,
        ...(student_ids.length > 0 && {
          student_id: { [Op.in]: student_ids },
        }),
      },
      include: [
        {
          model: Student,
          as: "student", // ✅ use the alias
          attributes: ["id", "name", "roll_number", "admission_number"],
        },
      ],
      order: [[{ model: Student, as: "student" }, "roll_number", "ASC"]],
    });

    res.json({ remarks });
  } catch (error) {
    console.error("Error fetching remarks summary:", error);
    res.status(500).json({ error: "Server error" });
  }
};


exports.getAttendanceSummary = async (req, res) => {
  try {
    const { class_id, section_id, term_id } = req.query;

    if (!class_id || !section_id || !term_id) {
      return res.status(400).json({ error: "Missing class_id, section_id or term_id" });
    }

    // 1. Get term date range
    const term = await Term.findByPk(term_id);
    if (!term) return res.status(404).json({ error: "Term not found" });

    const { start_date, end_date } = term;

    // 2. Get students in the class/section
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

    const studentIds = students.map((s) => s.id);

    // 3. Get attendances within date range
    const attendances = await Attendance.findAll({
      where: {
        studentId: { [Op.in]: studentIds },
        date: {
          [Op.between]: [start_date, end_date],
        },
      },
    });

    // 4. Group and summarize
    const summaryMap = {};

    for (const att of attendances) {
      const sid = att.studentId;
      if (!summaryMap[sid]) {
        summaryMap[sid] = {
          total_days: 0,
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
          holiday: 0,
        };
      }

      summaryMap[sid].total_days++;
      summaryMap[sid][att.status] = (summaryMap[sid][att.status] || 0) + 1;
    }

    // 5. Combine with student info
    const result = students.map((s) => {
      const att = summaryMap[s.id] || {
        total_days: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        holiday: 0,
      };

      const presentDays = att.present + att.late + att.leave;
      const attendancePercentage = att.total_days > 0 ? ((presentDays / att.total_days) * 100).toFixed(2) : null;

      return {
        student_id: s.id,
        name: s.name,
        roll_number: s.roll_number,
        admission_number: s.admission_number,
        total_days: att.total_days,
        present_days: att.present,
        absent_days: att.absent,
        leave_days: att.leave,
        holiday_days: att.holiday,
        late_days: att.late,
        attendance_percentage: attendancePercentage,
      };
    });

    res.json({ attendance: result });
  } catch (err) {
    console.error("Error in attendance summary:", err);
    res.status(500).json({ error: "Server error" });
  }
};


// 🔓 Public Controller — GET /report-card/format-by-class
exports.getReportCardFormatByClass = async (req, res) => {
  try {
    const { class_id } = req.query;
    if (!class_id) {
      return res.status(400).json({ error: "Missing class_id" });
    }

    const format = await getFormatForClass(class_id);
    if (!format) {
      return res.status(404).json({ error: "No format assigned for this class" });
    }

    res.json({ format });
  } catch (err) {
    console.error("Error fetching report card format:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// 🔒 Internal Utility — used during report card PDF generation
const getFormatForClass = async (class_id) => {
  const mapping = await ReportCardFormatClass.findOne({
    where: { class_id },
    include: [
      {
        model: ReportCardFormat,
        as: "format",
        attributes: ["id", "title", "header_html", "footer_html", "school_logo_url", "board_logo_url"],
      },
    ],
  });

  return mapping?.format || null;
};

// ✅ Optional: Export utility if needed elsewhere
exports.getFormatForClass = getFormatForClass;



// ==========================================
// ✅ Get Detailed Summary Report for Multiple Exams (Component + Total)
// ==========================================
exports.getMultiExamReportSummary = async (req, res) => {
  try {
    const {
      class_id,
      section_id,
      exam_ids = [],
      subjectComponents = [],
      sum,
      showSubjectTotals,
      includeGrades,
    } = req.body;

    if (
      !class_id ||
      !section_id ||
      !Array.isArray(exam_ids) ||
      exam_ids.length === 0 ||
      subjectComponents.length === 0
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const includeGradesBool =
      includeGrades === true || includeGrades === "true";

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

    const gradeSchemes = await GradeScheme.findAll({
      order: [["min_percent", "DESC"]],
    });

    const exams = await Exam.findAll({ where: { id: exam_ids } });
    const examMap = Object.fromEntries(exams.map((e) => [e.id, e.name]));

    const allStudentData = [];
    const summary = {
      components: {},
      total: getEmptyBuckets(),
    };
    const subjectComponentGroups = [];
    const componentMapBySubject = {};

    for (const { subject_id, component_ids } of subjectComponents) {
      const schedules = await ExamSchedule.findAll({
        where: {
          class_id,
          section_id,
          exam_id: exam_ids,
          subject_id,
        },
      });
      if (!schedules.length) continue;

      const subject = await Subject.findByPk(subject_id);
      const selectedComponentsPerExam = [];

      for (const sched of schedules) {
        const schemeEntries = await ExamScheme.findAll({
          where: {
            class_id,
            subject_id,
            term_id: sched.term_id,
          },
          include: [{ model: AssessmentComponent, as: "component" }],
        });

        const selectedComponents = component_ids.length
          ? schemeEntries.filter((e) =>
              component_ids.includes(e.component_id)
            )
          : schemeEntries;

        for (const comp of selectedComponents) {
          selectedComponentsPerExam.push({
            schedule_id: sched.id,
            exam_id: sched.exam_id,
            exam_name: examMap[sched.exam_id] || "",
            component_id: comp.component_id,
            component: comp.component,
            weightage_percent: comp.weightage_percent || 0,
          });

          const key = `${comp.component.abbreviation || comp.component.name} (${subject.name})`;
          summary.components[key] = getEmptyBuckets(comp.component.max_marks);
        }
      }

      if (!selectedComponentsPerExam.length) continue;
      componentMapBySubject[subject_id] = selectedComponentsPerExam;

      const total_weightage = selectedComponentsPerExam.reduce(
        (sum, c) => sum + c.weightage_percent,
        0
      );

      subjectComponentGroups.push({
        subject_id,
        subject_name: subject.name,
        total_weightage,
        components: selectedComponentsPerExam.map((c) => ({
          component_id: c.component_id,
          name: c.component.abbreviation || c.component.name,
          weightage_percent: c.weightage_percent,
          exam_id: c.exam_id,
          exam_name: c.exam_name,
        })),
      });

      const scheduleIds = selectedComponentsPerExam.map((c) => c.schedule_id);
      const allResults = await StudentExamResult.findAll({
        where: { exam_schedule_id: scheduleIds },
      });

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

        for (const comp of selectedComponentsPerExam) {
          const resEntry =
            allResults.find(
              (r) =>
                r.student_id === student.id &&
                r.component_id === comp.component_id &&
                r.exam_schedule_id === comp.schedule_id
            ) || {};

          const marks = resEntry.marks_obtained ?? null;
          const attendance = resEntry.attendance || "P";
          const weightage = comp.weightage_percent;
          const max = comp.component.max_marks || 100;
          const key = `${comp.component.abbreviation || comp.component.name} (${subject.name})`;

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
            exam_id: comp.exam_id,
            exam_name: comp.exam_name,
            component_id: comp.component_id,
            subject_id,
            subject_name: subject.name,
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

        stuObj.subject_totals_raw[subject_id] = rawTotal;
        stuObj.subject_totals_weighted[subject_id] = weightedTotal;

        if (includeGradesBool) {
          const maxRaw = selectedComponentsPerExam.reduce(
            (acc, c) => acc + (c.component.max_marks || 100),
            0
          );
          stuObj.subject_grades[subject_id] =
            maxRaw > 0
              ? getGrade((rawTotal / maxRaw) * 100, gradeSchemes)
              : null;
        }
      }
    }

    // Compute grand totals
    let grandRaw = 0,
      grandRawMax = 0,
      grandWeighted = 0,
      grandWeightMax = 0;
    const subjectIds = subjectComponents.map((sc) => parseInt(sc.subject_id, 10));

    for (const stu of allStudentData) {
      let sumRaw = 0,
        sumWeighted = 0,
        maxRaw = 0,
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
          maxWeight > 0
            ? parseFloat(((sumWeighted / maxWeight) * 100).toFixed(2))
            : null;
        stu.total_grade_raw =
          maxRaw > 0 ? getGrade((sumRaw / maxRaw) * 100, gradeSchemes) : null;
        stu.total_grade_weighted =
          maxWeight > 0
            ? getGrade((sumWeighted / maxWeight) * 100, gradeSchemes)
            : null;
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

    if (includeGradesBool) {
      const pr = grandRawMax > 0 ? (grandRaw / grandRawMax) * 100 : null;
      const pw =
        grandWeightMax > 0 ? (grandWeighted / grandWeightMax) * 100 : null;
      summary.grand_percent_raw = pr != null ? parseFloat(pr.toFixed(2)) : null;
      summary.grand_percent_weighted =
        pw != null ? parseFloat(pw.toFixed(2)) : null;
      summary.grand_total_grade_raw =
        pr != null ? getGrade(pr, gradeSchemes) : null;
      summary.grand_total_grade_weighted =
        pw != null ? getGrade(pw, gradeSchemes) : null;
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
    console.error("🔥 Error in getMultiExamReportSummary:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};


// — Helpers (unchanged) —
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


// ✅ Helper to get grade from percent
const getGradeFromPercent = (percent, gradeSchemes) => {
  const rounded = Math.round(percent * 1000) / 1000;
  for (const scheme of gradeSchemes) {
    const min = Number(scheme.min_percent);
    const max = Number(scheme.max_percent);
    if (rounded >= min && rounded <= max) return scheme.grade;
  }
  return "-";
};

exports.generateFinalReportPDF = async (req, res) => {
  try {
    const {
      html,
      filters,
      fileName = "FinalWeightedReport",
      orientation = "portrait",
    } = req.body;

    const {
      class_id,
      section_id,
      subject_components = [],
      includeGrades = false,
    } = filters || {};

    if (!html || !class_id || !section_id || !subject_components.length) {
      return res.status(400).json({ message: "Missing required data" });
    }

    const students = await Student.findAll({
      where: {
        class_id,
        section_id,
        status: "enabled",
        visible: true,
        roll_number: { [Op.ne]: null },
      },
      include: [
        { model: Class, as: "Class", attributes: ["class_name"] },
        { model: Section, as: "Section", attributes: ["section_name"] },
      ],
      order: [["roll_number", "ASC"]],
    });

    const gradeSchemes = includeGrades
      ? await GradeScheme.findAll({ order: [["min_percent", "ASC"]] })
      : [];

    const allHeadersSet = new Set();
    const studentScores = [];

    for (const student of students) {
      let grand_total = 0;
      let total_weightage = 0;
      const scores = {};

      for (const { subject_id, term_component_map = {} } of subject_components) {
        const subject = await Subject.findByPk(subject_id);
        const subjectName = subject?.name || "Unknown";

        let subject_total = 0;
        let subject_weightage = 0;

        for (const [term_id, component_ids] of Object.entries(term_component_map)) {
          const scheduleIds = (
            await ExamSchedule.findAll({
              where: { class_id, section_id, subject_id, term_id },
              attributes: ["id"],
            })
          ).map((s) => s.id);

          if (scheduleIds.length && component_ids.length) {
            const schemes = await ExamScheme.findAll({
              where: {
                class_id,
                subject_id,
                term_id,
                component_id: { [Op.in]: component_ids },
              },
              include: [{ model: AssessmentComponent, as: "component" }],
            });

            for (const scheme of schemes) {
              const comp = scheme.component;
              const colKey = `${subjectName}-${comp.abbreviation || comp.name}`;
              allHeadersSet.add(colKey);

              const weightage = parseFloat(scheme.weightage_percent) || 0;
              const max_marks = comp?.max_marks || 0;

              const result = await StudentExamResult.findOne({
                where: {
                  student_id: student.id,
                  component_id: scheme.component_id,
                  attendance: "P",
                  exam_schedule_id: { [Op.in]: scheduleIds },
                },
              });

              const mo = result?.marks_obtained ?? null;
              if (mo !== null && max_marks > 0) {
                const weighted = (mo / max_marks) * weightage;
                scores[colKey] = weighted.toFixed(2);
                subject_total += weighted;
              } else {
                scores[colKey] = "-";
              }

              subject_weightage += weightage;
            }
          }
        }

        grand_total += subject_total;
        total_weightage += subject_weightage;
      }

      const percentage =
        total_weightage > 0 ? (grand_total / total_weightage) * 100 : 0;

      const grade = includeGrades
        ? getGradeFromPercent(percentage, gradeSchemes)
        : "-";

      studentScores.push({
        roll_number: student.roll_number,
        name: student.name,
        class_section: `${student.Class?.class_name}-${student.Section?.section_name}`,
        scores,
        total: grand_total.toFixed(2),
        grade,
      });
    }

    const allHeaders = Array.from(allHeadersSet).sort();

    // 🧾 Generate table HTML
    let table = `<table border="1" cellspacing="0" cellpadding="5" width="100%" style="border-collapse: collapse; text-align:center">
      <thead><tr>
        <th>Roll No</th><th>Name</th><th>Class</th>`;
    allHeaders.forEach((h) => (table += `<th>${h}</th>`));
    table += `<th>Total</th><th>Grade</th></tr></thead><tbody>`;

    studentScores.forEach((s) => {
      table += `<tr>
        <td>${s.roll_number}</td>
        <td>${s.name}</td>
        <td>${s.class_section}</td>`;
      allHeaders.forEach((h) => {
        table += `<td>${s.scores[h] || "-"}</td>`;
      });
      table += `<td>${s.total}</td><td>${s.grade}</td></tr>`;
    });

    table += `</tbody></table>`;

    // 🧩 Fill template
    const template = handlebars.compile(html);
    const finalHtml = template({ table });

    // 📄 File path
    const filePath = path.join(
      __dirname,
      `../exports/${fileName}-${Date.now()}.pdf`
    );

    // 🧠 Puppeteer
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: "networkidle0" });

    await page.pdf({
      path: filePath,
      format: "A4",
      landscape: orientation === "landscape",
      printBackground: true,
      margin: { top: "40px", bottom: "40px", left: "20px", right: "20px" },
    });

    await browser.close();

    // 📦 Send and delete file
    res.download(filePath, () => {
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error("🔥 PDF generation error:", error);
    res
      .status(500)
      .json({ message: "Failed to generate PDF", error: error.message });
  }
};
