const {
  ExamScheme,
  Class,
  Subject,
  Term,
  AssessmentComponent,
  sequelize, 
} = require("../models");


const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

// ============ Multer Setup ============
const upload = multer({ dest: "uploads/" });

// ==============================
// GET all exam schemes (with filters)
// ==============================
exports.getAllSchemes = async (req, res) => {
  try {
    const { class_id, subject_id, term_id } = req.query;
    const where = {};
    if (class_id) where.class_id = class_id;
    if (subject_id) where.subject_id = subject_id;
    if (term_id) where.term_id = term_id;

    const schemes = await ExamScheme.findAll({
      where,
      include: [
        { model: Class, as: "class", attributes: ["id", "class_name"] },
        { model: Subject, as: "subject", attributes: ["id", "name"] },
        { model: Term, as: "term", attributes: ["id", "name"] },
        { model: AssessmentComponent, as: "component", attributes: ["id", "name", "abbreviation"] },
      ],
    });

    res.json(schemes);
  } catch (err) {
    console.error("🔥 ERROR in GET /exam-schemes:", err);
    res.status(500).json({ error: "Failed to fetch exam schemes" });
  }
};

// ==============================
// POST - Create new exam scheme
// ==============================
exports.createScheme = async (req, res) => {
  try {
    const { class_id, subject_id, term_id, component_id, weightage_percent } = req.body;

    if (!class_id || !subject_id || !term_id || !component_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const scheme = await ExamScheme.create({
      class_id,
      subject_id,
      term_id,
      component_id,
      weightage_percent: weightage_percent || 0,
    });

    res.status(201).json(scheme);
  } catch (err) {
    console.error("🔥 Error in POST /exam-schemes:", err);
    res.status(500).json({ error: "Failed to create exam scheme" });
  }
};

// ==============================
// PUT - Update exam scheme
// ==============================
exports.updateScheme = async (req, res) => {
  try {
    const { id } = req.params;
    const { class_id, subject_id, term_id, component_id, weightage_percent } = req.body;

    const scheme = await ExamScheme.findByPk(id);
    if (!scheme) return res.status(404).json({ error: "Scheme not found" });

    await scheme.update({
      class_id,
      subject_id,
      term_id,
      component_id,
      weightage_percent,
    });

    res.json(scheme);
  } catch (err) {
    console.error("🔥 Error in PUT /exam-schemes/:id:", err);
    res.status(500).json({ error: "Failed to update exam scheme" });
  }
};

// ==============================
// DELETE - Remove exam scheme
// ==============================
exports.deleteScheme = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await ExamScheme.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({ error: "Scheme not found or already deleted" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("🔥 Error in DELETE /exam-schemes/:id:", err);
    res.status(500).json({ error: "Failed to delete exam scheme" });
  }
};


// ==============================
// POST - Reorder exam schemes
// ==============================
exports.reorderSchemes = async (req, res) => {
  const { schemes } = req.body;  
  // Expecting: [{ id: 12, serial_order: 1 }, { id: 34, serial_order: 2 }, …]
  const transaction = await sequelize.transaction();
  try {
    for (const { id, serial_order } of schemes) {
      await ExamScheme.update(
        { serial_order },
        { where: { id }, transaction }
      );
    }
    await transaction.commit();
    res.json({ message: "Order updated successfully" });
  } catch (err) {
    await transaction.rollback();
    console.error("🔥 Reorder error:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
};

// ==============================
// GET - Components by class, subject, and exam
// ==============================
exports.getComponentsForSubjectAndExam = async (req, res) => {
  try {
    const { class_id, subject_id, exam_id } = req.query;

    if (!class_id || !subject_id || !exam_id) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    // ✅ Get the exam to extract term_id
    const exam = await sequelize.models.Exam.findByPk(exam_id);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const term_id = exam.term_id;

    // ✅ Fetch exam schemes for this class, subject, and term
    const schemes = await ExamScheme.findAll({
      where: {
        class_id,
        subject_id,
        term_id,
      },
      include: [
        {
          model: sequelize.models.AssessmentComponent,
          as: "component",
          attributes: ["id", "name", "abbreviation"],
        },
      ],
      order: [["serial_order", "ASC"]],
    });

    // ✅ Format the response
    const components = schemes.map((s) => ({
      component_id: s.component_id,
      name: s.component?.name,
      abbreviation: s.component?.abbreviation,
      max_marks: s.max_marks,
    }));

    res.json(components);
  } catch (error) {
    console.error("🔥 Error in getComponentsForSubjectAndExam:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};



// ==============================
// EXPORT Exam Schemes to Excel
// ==============================
exports.exportSchemesToExcel = async (req, res) => {
  try {
    const schemes = await ExamScheme.findAll({
      include: [
        { model: Class, as: "class" },
        { model: Subject, as: "subject" },
        { model: Term, as: "term" },
        { model: AssessmentComponent, as: "component" },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Exam Schemes");

    sheet.columns = [
      { header: "Class", key: "class", width: 20 },
      { header: "Subject", key: "subject", width: 25 },
      { header: "Term", key: "term", width: 20 },
      { header: "Component", key: "component", width: 25 },
      { header: "Weightage (%)", key: "weightage", width: 15 },
    ];

    schemes.forEach((scheme) => {
      sheet.addRow({
        class: scheme.class?.class_name || "",
        subject: scheme.subject?.name || "",
        term: scheme.term?.name || "",
        component: scheme.component?.abbreviation || "",
        weightage: scheme.weightage_percent,
      });
    });

    const filePath = path.join(__dirname, `../exports/ExamSchemes-${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, () => {
      fs.unlinkSync(filePath); // cleanup
    });
  } catch (err) {
    console.error("🔥 Error exporting exam schemes:", err);
    res.status(500).json({ error: "Failed to export exam schemes" });
  }
};

// ==============================
// IMPORT Exam Schemes from Excel (with duplicate prevention)
// ==============================
exports.importSchemesFromExcel = [
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(req.file.path);
      const sheet = workbook.worksheets[0];

      const rows = [];
      sheet.eachRow((row, index) => {
        if (index === 1) return; // Skip header
        rows.push(row.values);
      });

      const classMap = await Class.findAll({ attributes: ["id", "class_name"] });
      const subjectMap = await Subject.findAll({ attributes: ["id", "name"] });
      const termMap = await Term.findAll({ attributes: ["id", "name"] });
      const componentMap = await AssessmentComponent.findAll({ attributes: ["id", "abbreviation"] });

      const getId = (arr, field, value) => {
        const found = arr.find((item) => item[field] === value);
        return found ? found.id : null;
      };

      const inserted = [];

      for (const row of rows) {
        const [, className, subjectName, termName, componentAbbr, weightage] = row;

        const class_id = getId(classMap, "class_name", className);
        const subject_id = getId(subjectMap, "name", subjectName);
        const term_id = getId(termMap, "name", termName);
        const component_id = getId(componentMap, "abbreviation", componentAbbr);

        if (class_id && subject_id && term_id && component_id) {
          const exists = await ExamScheme.findOne({
            where: { class_id, subject_id, term_id, component_id },
          });

          if (!exists) {
            inserted.push({
              class_id,
              subject_id,
              term_id,
              component_id,
              weightage_percent: parseFloat(weightage || 0),
            });
          }
        }
      }

      await ExamScheme.bulkCreate(inserted);
      fs.unlinkSync(req.file.path); // clean up uploaded file

      res.json({
        message: `Import completed. ${inserted.length} new schemes added.`,
        count: inserted.length,
      });
    } catch (err) {
      console.error("🔥 Error importing exam schemes:", err);
      res.status(500).json({ error: "Failed to import exam schemes" });
    }
  },
];


// ==============================
// PATCH - Lock or Unlock Exam Scheme Component
// ==============================
exports.toggleLockScheme = async (req, res) => {
  const { id } = req.params;
  let { is_locked } = req.body;

  // 💡 Force type coercion
  if (typeof is_locked === "string") {
    if (is_locked.toLowerCase() === "true") is_locked = true;
    else if (is_locked.toLowerCase() === "false") is_locked = false;
    else return res.status(400).json({ error: "Invalid string for is_locked" });
  }

  if (typeof is_locked !== "boolean") {
    return res.status(400).json({ error: "is_locked must be a boolean" });
  }

  try {
    const scheme = await ExamScheme.findByPk(id);
    if (!scheme) {
      return res.status(404).json({ error: "Exam scheme not found" });
    }

    await scheme.update({ is_locked });
    res.json({ message: `Component has been ${is_locked ? "locked" : "unlocked"} successfully.`, scheme });
  } catch (error) {
    console.error("Toggle Lock Error:", error);
    res.status(500).json({ error: "Failed to update lock status" });
  }
};


// ==============================
// GET - Components Grouped by Term for a Class & Subject
// ==============================
exports.getTermWiseComponents = async (req, res) => {
  const { class_id, subject_id } = req.query;

  if (!class_id || !subject_id) {
    return res.status(400).json({ message: "Missing class_id or subject_id" });
  }

  try {
    const schemes = await ExamScheme.findAll({
      where: {
        class_id,
        subject_id,
      },
      include: [
        {
          model: Term,
          as: "term",
          attributes: ["id", "name"],
        },
        {
          model: AssessmentComponent,
          as: "component",
          attributes: ["id", "name", "abbreviation"],
        },
      ],
      order: [["serial_order", "ASC"]],
    });

    const result = schemes.map((s) => ({
      component_id: s.component_id,
      name: s.component?.name,
      abbreviation: s.component?.abbreviation,
      term_id: s.term_id,
    }));

    res.json(result);
  } catch (error) {
    console.error("🔥 getTermWiseComponents error:", error);
    res.status(500).json({ message: "Failed to fetch term-wise components" });
  }
};





