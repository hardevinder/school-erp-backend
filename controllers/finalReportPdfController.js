const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
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

// Helper for grading
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

      const percentage = total_weightage > 0
        ? (grand_total / total_weightage) * 100
        : 0;
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

    let table = `<table border="1" cellspacing="0" cellpadding="5" width="100%" style="border-collapse: collapse; text-align:center">
      <thead><tr>
        <th>Roll No</th><th>Name</th><th>Class</th>`;
    allHeaders.forEach(h => table += `<th>${h}</th>`);
    table += `<th>Total</th><th>Grade</th></tr></thead><tbody>`;

    studentScores.forEach((s) => {
      table += `<tr>
        <td>${s.roll_number}</td>
        <td>${s.name}</td>
        <td>${s.class_section}</td>`;
      allHeaders.forEach(h => {
        table += `<td>${s.scores[h] || "-"}</td>`;
      });
      table += `<td>${s.total}</td><td>${s.grade}</td></tr>`;
    });

    table += `</tbody></table>`;

    const template = handlebars.compile(html);
    const finalHtml = template({ table });

    const filePath = path.join(__dirname, `../exports/${fileName}-${Date.now()}.pdf`);

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

    res.download(filePath, () => {
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error("🔥 PDF generation error:", error);
    res.status(500).json({ message: "Failed to generate PDF", error: error.message });
  }
};
