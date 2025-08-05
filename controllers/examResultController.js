const {
  StudentExamResult,
  ExamSchedule,
  Incharge,
  ClassSubjectTeacher,
} = require("../models");

exports.enterMarks = async (req, res) => {
  try {
    const { exam_schedule_id, component_id, marks = [] } = req.body;
    const userId = req.user.id;

    if (!exam_schedule_id || !component_id || !Array.isArray(marks)) {
      return res.status(400).json({ error: "Missing required data" });
    }

    // ✅ Load exam schedule to extract class/section/subject info
    const examSchedule = await ExamSchedule.findByPk(exam_schedule_id);
    if (!examSchedule) {
      return res.status(404).json({ error: "Exam schedule not found" });
    }

    const { class_id, section_id, subject_id } = examSchedule;

    // ✅ Check if user is incharge for class & section
    const isIncharge = await Incharge.findOne({
      where: {
        teacherId: userId,
        classId: class_id,
        sectionId: section_id,
      },
    });

    // ✅ Check if user is assigned as subject teacher
    const isSubjectTeacher = await ClassSubjectTeacher.findOne({
      where: {
        teacher_id: userId,
        class_id,
        section_id,
        subject_id,
      },
    });

    // ❌ Deny if neither condition is met
    if (!isIncharge && !isSubjectTeacher) {
      return res.status(403).json({
        error: "You are not authorized to enter marks for this class/subject.",
      });
    }

    // ✅ Proceed with mark creation/updating
    const createdOrUpdated = [];

    for (const record of marks) {
      const { student_id, marks_obtained } = record;

      const existing = await StudentExamResult.findOne({
        where: { student_id, exam_schedule_id, component_id },
      });

      if (existing) {
        await existing.update({ marks_obtained });
        createdOrUpdated.push({ student_id, updated: true });
      } else {
        await StudentExamResult.create({
          student_id,
          exam_schedule_id,
          component_id,
          marks_obtained,
        });
        createdOrUpdated.push({ student_id, created: true });
      }
    }

    return res.status(200).json({
      message: "Marks saved successfully",
      result: createdOrUpdated,
    });
  } catch (error) {
    console.error("Error saving marks:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
