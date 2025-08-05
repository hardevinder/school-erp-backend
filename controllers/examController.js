const { ExamScheme, Class, Subject, Term, Exam, User } = require("../models");

// ==============================
// GET all exams
// ==============================
exports.getAllExams = async (req, res) => {
  try {
    const exams = await Exam.findAll({
      include: [
        {
          model: Term,
          as: "term",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "lockedBy",
          attributes: ["id", "username", "name"],
        },
      ],
      order: [["start_date", "ASC"]],
    });
    res.json(exams);
  } catch (err) {
    console.error("🔥 Error fetching exams:", err);
    res.status(500).json({ error: "Failed to fetch exams" });
  }
};

// ==============================
// GET single exam by ID
// ==============================
exports.getExamById = async (req, res) => {
  try {
    const exam = await Exam.findByPk(req.params.id, {
      include: [
        {
          model: Term,
          as: "term",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "lockedBy",
          attributes: ["id", "username", "name"],
        },
      ],
    });
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    res.json(exam);
  } catch (err) {
    console.error("🔥 Error fetching exam by ID:", err);
    res.status(500).json({ error: "Failed to fetch exam" });
  }
};

// ==============================
// CREATE new exam
// ==============================
exports.createExam = async (req, res) => {
  try {
    const { name, term_id, start_date, end_date, exam_type } = req.body;

    if (!name || !term_id || !start_date || !end_date || !exam_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const exam = await Exam.create({ name, term_id, start_date, end_date, exam_type });
    res.status(201).json({ message: "Exam created", exam });
  } catch (err) {
    console.error("🔥 Error creating exam:", err);
    res.status(500).json({ error: "Failed to create exam" });
  }
};

// ==============================
// UPDATE exam
// ==============================
exports.updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, term_id, start_date, end_date, exam_type } = req.body;

    const exam = await Exam.findByPk(id);
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    if (exam.is_locked) {
      return res.status(403).json({ error: "Exam is locked. Cannot update." });
    }

    await exam.update({ name, term_id, start_date, end_date, exam_type });
    res.json({ message: "Exam updated", exam });
  } catch (err) {
    console.error("🔥 Error updating exam:", err);
    res.status(500).json({ error: "Failed to update exam" });
  }
};

// ==============================
// DELETE exam
// ==============================
exports.deleteExam = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await Exam.findByPk(id);
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    if (exam.is_locked) {
      return res.status(403).json({ error: "Exam is locked. Cannot delete." });
    }

    await exam.destroy();
    res.json({ message: "Exam deleted" });
  } catch (err) {
    console.error("🔥 Error deleting exam:", err);
    res.status(500).json({ error: "Failed to delete exam" });
  }
};

// ==============================
// TOGGLE LOCK status
// ==============================
exports.toggleExamLock = async (req, res) => {
  try {
    const { exam_id, lock } = req.body;

    const exam = await Exam.findByPk(exam_id);
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    exam.is_locked = lock;
    exam.locked_by = lock ? req.user.id : null;
    exam.locked_at = lock ? new Date() : null;

    await exam.save();
    res.json({ message: `Exam ${lock ? "locked" : "unlocked"} successfully`, exam });
  } catch (err) {
    console.error("🔥 Error toggling exam lock:", err);
    res.status(500).json({ error: "Failed to toggle lock", detail: err.message });
  }
};

// ==============================
// GET: Class ➝ Exam ➝ Subjects structure from ExamScheme
// ==============================
exports.getClassExamSubjectStructure = async (req, res) => {
  try {
    const schemes = await ExamScheme.findAll({
      include: [
        {
          model: Class,
          as: "class",
          attributes: ["id", "class_name"],
        },
        {
          model: Subject,
          as: "subject",
          attributes: ["id", "name"],
        },
        {
          model: Term,
          as: "term",
          attributes: ["id", "name"],
        },
      ],
    });

    const classMap = {};

    for (const scheme of schemes) {
      const classId = scheme.class.id;

      // ✅ Fetch exam manually by term_id
      const exam = await Exam.findOne({
        where: { term_id: scheme.term.id },
        attributes: ["id", "name"],
      });

      if (!exam) continue;

      if (!classMap[classId]) {
        classMap[classId] = {
          class_id: classId,
          class_name: scheme.class.class_name,
          exams: [],
        };
      }

      const classEntry = classMap[classId];

      let examEntry = classEntry.exams.find((e) => e.exam_id === exam.id);
      if (!examEntry) {
        examEntry = {
          exam_id: exam.id,
          exam_name: exam.name,
          subjects: [],
        };
        classEntry.exams.push(examEntry);
      }

      const alreadyAdded = examEntry.subjects.some((s) => s.id === scheme.subject.id);
      if (!alreadyAdded) {
        examEntry.subjects.push({
          id: scheme.subject.id,
          name: scheme.subject.name,
        });
      }
    }

    res.json(Object.values(classMap));
  } catch (err) {
    console.error("🔥 Error in getClassExamSubjectStructure:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
