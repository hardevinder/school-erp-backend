const puppeteer = require("puppeteer");
const { Op } = require("sequelize");
const {
  Student,
  Class,
  Section,
  Subject,
  ExamSchedule,
  ExamScheme,
  AssessmentComponent,
  StudentExamResult,
  GradeScheme,
} = require("../models");

const getGradeFromPercent = (percent, gradeSchemes) => {
  const rounded = Math.round(percent * 1000) / 1000;
  for (const scheme of gradeSchemes) {
    const min = Number(scheme.min_percent);
    const max = Number(scheme.max_percent);
    if (rounded >= min && rounded <= max) {
      return scheme.grade;
    }
  }
  return "-";
};



// ✅ Final Report Summary with Grades
const getFinalReportSummary = async (req, res) => {
  try {
    const {
      class_id,
      section_id,
      subject_components = [],
      includeGrades = false,
    } = req.body;

    if (!class_id || !section_id || subject_components.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
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



    const results = [];

    for (const student of students) {
      const studentData = {
        student_id: student.id,
        name: student.name,
        admission_number: student.admission_number,
        roll_number: student.roll_number, // ✅ NEW LINE
        class: student.Class?.class_name,
        section: student.Section?.section_name,
        subjects: [],
        grand_total: 0,
        total_weightage: 0,
        percentage: 0,
        grand_grade: null,
      };

      for (const { subject_id, term_component_map = {} } of subject_components) {
        const subject = await Subject.findByPk(subject_id);
        const subjectName = subject?.name || "Unknown";

        let subject_total = 0;
        let subject_weightage = 0;
        const term_scores = {};

        for (const [term_id, component_ids] of Object.entries(term_component_map)) {
          let term_total = 0;
          let term_weightage = 0;

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
              const weightage = parseFloat(scheme.weightage_percent) || 0;
              const max_marks = scheme.component?.max_marks || 0;

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
                term_total += (mo / max_marks) * weightage;
              }

              term_weightage += weightage;
            }

            subject_total += term_total;
            subject_weightage += term_weightage;
            term_scores[`term${term_id}_weighted`] = term_total.toFixed(2);
            term_scores[`term${term_id}_max_weightage`] = term_weightage.toFixed(2);
          }
        }

        const subjectPercent = subject_weightage > 0
          ? (subject_total / subject_weightage) * 100
          : 0;

        studentData.subjects.push({
          subject_id,
          subject_name: subjectName,
          ...term_scores,
          final_total: subject_total.toFixed(2),
          total_max_weightage: subject_weightage.toFixed(2),
          grade:
            includeGrades && subject_weightage > 0
              ? getGradeFromPercent(subjectPercent, gradeSchemes)
              : null,
        });

        studentData.grand_total += subject_total;
        studentData.total_weightage += subject_weightage;
      }

      studentData.percentage =
        studentData.total_weightage > 0
          ? parseFloat(
              ((studentData.grand_total / studentData.total_weightage) * 100).toFixed(2)
            )
          : 0;

      if (includeGrades && studentData.total_weightage > 0) {
        studentData.grand_grade = getGradeFromPercent(
          studentData.percentage,
          gradeSchemes
        );
      }

      results.push(studentData);
    }

    return res.status(200).json(results);
  } catch (err) {
    // console.error("🔥 Error in getFinalReportSummary:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ PDF Generator
const generateFinalReportPDF = async (req, res) => {
  try {
    const {
      html,
      filters,
      fileName = "FinalWeightedReport",
      orientation = "portrait",
    } = req.body;

    const { class_id, section_id } = filters || {};
    if (!html || !class_id || !section_id) {
      return res.status(400).json({ message: "Missing required data" });
    }

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
            h3 { text-align: center; margin: 0 0 20px 0; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 6px; text-align: center; }
            .text-start { text-align: left; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tr { page-break-inside: avoid; }
            .page-break { page-break-after: always; }
            .footer { margin-top: 40px; text-align: right; font-style: italic; font-size: 11px; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `;

    await page.setContent(fullHtml, { waitUntil: "networkidle0", timeout: 0 });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: orientation === "landscape",
      printBackground: true,
      margin: { top: "40px", bottom: "40px", left: "20px", right: "20px" },
    });

    await browser.close();

    if (!pdfBuffer || !pdfBuffer.length) {
      return res.status(500).json({ message: "Empty PDF buffer" });
    }

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });

    res.end(pdfBuffer);
  } catch (error) {
    // console.error("PDF generation failed:", error);
    res.status(500).json({ message: "Failed to generate PDF", error: error.message });
  }
};

module.exports = {
  getFinalReportSummary,
  generateFinalReportPDF,
};
