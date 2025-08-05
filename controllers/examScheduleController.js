const { ExamSchedule, Exam, Class, Section, Subject } = require("../models");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const upload = multer({ dest: "uploads/" });

// ==============================
// GET all exam schedules (with filters)
// ==============================
exports.getAllSchedules = async (req, res) => {
  try {
    const { class_id, section_id, exam_id } = req.query;
    const where = {};
    if (class_id) where.class_id = class_id;
    if (section_id) where.section_id = section_id;
    if (exam_id) where.exam_id = exam_id;

    const schedules = await ExamSchedule.findAll({
      where,
      include: [
        { model: Exam, as: "exam", attributes: ["id", "name"] },
        { model: Class, as: "class", attributes: ["id", "class_name"] },
        { model: Section, as: "section", attributes: ["id", "section_name"] },
        { model: Subject, as: "subject", attributes: ["id", "name"] },
      ],
      order: [["exam_date", "ASC"]],
    });

    res.json(schedules);
  } catch (err) {
    console.error("🔥 Error in GET /exam-schedules:", err);
    res.status(500).json({ error: "Failed to fetch exam schedules" });
  }
};

// ==============================
// POST - Create new exam schedule
// ==============================
exports.createSchedule = async (req, res) => {
  try {
    const { exam_id, class_id, section_id, subject_id, exam_date, start_time, end_time } = req.body;

    if (!exam_id || !class_id || !section_id || !subject_id || !exam_date || !start_time || !end_time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const schedule = await ExamSchedule.create({
      exam_id,
      class_id,
      section_id,
      subject_id,
      exam_date,
      start_time,
      end_time,
    });

    res.status(201).json({ message: "Schedule created successfully", schedule });
  } catch (err) {
    console.error("🔥 Error in POST /exam-schedules:", err);
    res.status(500).json({ error: "Failed to create schedule" });
  }
};

// ==============================
// PUT - Update exam schedule
// ==============================
exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { exam_id, class_id, section_id, subject_id, exam_date, start_time, end_time } = req.body;

    const schedule = await ExamSchedule.findByPk(id);
    if (!schedule) return res.status(404).json({ error: "Schedule not found" });

    await schedule.update({
      exam_id,
      class_id,
      section_id,
      subject_id,
      exam_date,
      start_time,
      end_time,
    });

    res.json({ message: "Schedule updated", schedule });
  } catch (err) {
    console.error("🔥 Error in PUT /exam-schedules/:id:", err);
    res.status(500).json({ error: "Failed to update schedule" });
  }
};

// ==============================
// DELETE - Remove exam schedule
// ==============================
exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await ExamSchedule.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({ error: "Schedule not found or already deleted" });
    }

    res.json({ message: "Schedule deleted" });
  } catch (err) {
    console.error("🔥 Error in DELETE /exam-schedules/:id:", err);
    res.status(500).json({ error: "Failed to delete schedule" });
  }
};

// ==============================
// EXPORT Exam Schedule to Excel
// ==============================
exports.exportScheduleToExcel = async (req, res) => {
  try {
    const schedules = await ExamSchedule.findAll({
      include: [
        { model: Exam, as: "exam" },
        { model: Class, as: "class" },
        { model: Section, as: "section" },
        { model: Subject, as: "subject" },
      ],
      order: [["exam_date", "ASC"]],
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Exam Schedules");

    sheet.columns = [
      { header: "Exam", key: "exam", width: 25 },
      { header: "Class", key: "class", width: 10 },
      { header: "Section", key: "section", width: 10 },
      { header: "Subject", key: "subject", width: 20 },
      { header: "Exam Date", key: "exam_date", width: 15 },
      { header: "Start Time", key: "start_time", width: 15 },
      { header: "End Time", key: "end_time", width: 15 },
    ];

    schedules.forEach((s) => {
      sheet.addRow({
        exam: s.exam?.name || "",
        class: s.class?.class_name || "",
        section: s.section?.section_name || "",
        subject: s.subject?.name || "",
        exam_date: s.exam_date,
        start_time: s.start_time,
        end_time: s.end_time,
      });
    });

    const filePath = path.join(__dirname, `../exports/ExamSchedules-${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, () => {
      fs.unlinkSync(filePath); // cleanup after sending
    });
  } catch (err) {
    console.error("🔥 Error exporting exam schedule:", err);
    res.status(500).json({ error: "Failed to export schedule" });
  }
};

// ==============================
// IMPORT Exam Schedule from Excel
// ==============================
exports.importScheduleFromExcel = [
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(req.file.path);
      const sheet = workbook.worksheets[0];

      const rows = [];
      sheet.eachRow((row, index) => {
        if (index === 1) return; // Skip header row
        rows.push(row.values);
      });

      const exams = await Exam.findAll();     // Includes term_id field
      const classes = await Class.findAll();
      const sections = await Section.findAll();
      const subjects = await Subject.findAll();

      const getId = (arr, key, value) => {
        const found = arr.find((item) => item[key] === value);
        return found ? found.id : null;
      };

      let inserted = 0;
      for (const row of rows) {
        const [, examName, className, sectionName, subjectName, exam_date, start_time, end_time] = row;

        const exam = exams.find(e => e.name === examName);
        const exam_id = exam?.id;
        const term_id = exam?.term_id;

        const class_id = getId(classes, "class_name", className);
        const section_id = getId(sections, "section_name", sectionName);
        const subject_id = getId(subjects, "name", subjectName);

        if (!exam_id || !class_id || !section_id || !subject_id || !term_id) continue;

        const exists = await ExamSchedule.findOne({
          where: { exam_id, class_id, section_id, subject_id, exam_date },
        });

        if (!exists) {
          await ExamSchedule.create({
            exam_id,
            term_id,
            class_id,
            section_id,
            subject_id,
            exam_date,
            start_time,
            end_time,
          });
          inserted++;
        }
      }

      fs.unlinkSync(req.file.path);
      res.json({ message: `✅ Successfully imported ${inserted} new schedules.` });
    } catch (err) {
      console.error("🔥 Error importing exam schedules:", err);
      res.status(500).json({ error: "Failed to import schedule" });
    }
  },
];