const { Op } = require("sequelize");
const {
  Student,
  Subject,
  ExamSchedule,
  ExamScheme,
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
        ...(student_ids.length > 0 && {
          id: { [Op.in]: student_ids },
        }),
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
      exam_id,
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
        return res.status(400).json({ message: "Class/Section not provided and you're not an incharge." });
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
      return res.status(403).json({ message: "You are not incharge of this class-section." });
    }

    const data = await getScholasticSummaryForReportCard({
      class_id,
      section_id,
      exam_id,
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

// ✅ INTERNAL HELPER FUNCTION
async function getScholasticSummaryForReportCard({
  class_id,
  section_id,
  exam_id,
  subjectComponents,
  gradeSchemeId,
  student_ids = [],
}) {
  if (!class_id || !section_id || !exam_id || !subjectComponents.length) {
    throw new Error("Missing required fields for scholastic summary");
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
  });

 const gradeSchemes = await GradeScheme.findAll({
  order: [["min_percent", "DESC"]],
});



  const allStudentData = [];
  const subjectComponentGroups = [];
  const componentMapBySubject = {};

  for (const group of subjectComponents) {
    const { subject_id, component_ids } = group;

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
              r.student_id === student.id &&
              r.component_id === comp.component_id
          ) || {};
        const marks = resEntry.marks_obtained ?? null;
        const attendance = resEntry.attendance || "P";
        const weightage = comp.weightage_percent || 0;
        const max = comp.component.max_marks || 100;

        const weighted_marks =
          marks != null && attendance === "P"
            ? parseFloat(((marks / max) * weightage).toFixed(2))
            : null;

        rawTotal += marks != null && attendance === "P" ? marks : 0;
        weightedTotal += weighted_marks != null ? weighted_marks : 0;

        stuObj.components.push({
          component_id: comp.component_id,
          subject_id,
          name: `${comp.component.abbreviation || comp.component.name}`,
          marks,
          weighted_marks,
          attendance,
          weightage_percent: weightage,
          grade: marks != null && attendance === "P"
            ? getGrade((marks / max) * 100, gradeSchemes)
            : null,
          weighted_grade: weighted_marks != null
            ? getGrade((weighted_marks / weightage) * 100, gradeSchemes)
            : null,
        });
      }

      if (selectedComponents.length > 0) {
        stuObj.subject_totals_raw[subject_id] = rawTotal;
        stuObj.subject_totals_weighted[subject_id] = weightedTotal;
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

  for (const stu of allStudentData) {
    let sumRaw = 0,
      sumWeighted = 0;
    let maxRaw = 0,
      maxWeight = 0;

    for (const sid of subjectComponents.map((sc) => parseInt(sc.subject_id))) {
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

    stu.total_grade_raw =
      maxRaw > 0 ? getGrade((sumRaw / maxRaw) * 100, gradeSchemes) : null;
    stu.total_grade_weighted =
      maxWeight > 0 ? getGrade((sumWeighted / maxWeight) * 100, gradeSchemes) : null;
  }

  return {
    students: allStudentData,
    subjectComponentGroups,
  };
}

// ✅ Grade Mapping Helper
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