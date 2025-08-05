const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const { Op } = require("sequelize");

const {
  Student,
  StudentExamResult,
  ExamSchedule,
  AssessmentComponent,
  Subject,
  Class,
  Section,
} = require("../models");

exports.generatePDFReport = async (req, res) => {
  try {
    const { html, filters, fileName = "ResultReport" } = req.body;

    if (!html || !filters || !filters.class_id || !filters.section_id || !filters.exam_id) {
      return res.status(400).json({ message: "Missing required data" });
    }

    const class_id = parseInt(filters.class_id);
    const section_id = parseInt(filters.section_id);
    const exam_id = parseInt(filters.exam_id);

    // 🔍 Fetch students and results
    const students = await Student.findAll({
      where: { class_id, section_id, status: "enabled" },
      include: [
        {
          model: StudentExamResult,
          as: "results",
          include: [
            {
              model: ExamSchedule,
              as: "schedule",
              where: { exam_id },
              include: [{ model: Subject, as: "subject" }],
            },
            { model: AssessmentComponent, as: "component" },
          ],
        },
        { model: Class, as: "Class", attributes: ["class_name"] },
        { model: Section, as: "Section", attributes: ["section_name"] },
      ],
      order: [["roll_number", "ASC"]],
    });

    if (!students.length) {
      return res.status(404).json({ message: "No student data found." });
    }

    // 🔍 Determine all unique Subject-Component combinations
    const allColumnsSet = new Set();
    students.forEach((student) => {
      student.results.forEach((r) => {
        const key = `${r.schedule.subject.subject_name}-${r.component.abbreviation || r.component.name}`;
        allColumnsSet.add(key);
      });
    });
    const allColumns = Array.from(allColumnsSet).sort();

    // 🧱 Build Excel-style HTML table
    let table = `<table border="1" cellspacing="0" cellpadding="5" width="100%" style="border-collapse: collapse; text-align:center">
      <thead>
        <tr>
          <th>Roll No</th>
          <th>Name</th>
          <th>Class</th>`;
    allColumns.forEach((col) => {
      table += `<th>${col}</th>`;
    });
    table += `<th>Total</th><th>Grade</th></tr></thead><tbody>`;

    students.forEach((student) => {
      const scoreMap = {};
      let total = 0;

      student.results.forEach((r) => {
        const key = `${r.schedule.subject.subject_name}-${r.component.abbreviation || r.component.name}`;
        scoreMap[key] = r.marks_obtained;
        total += r.marks_obtained || 0;
      });

      // Grade logic
      let grade = "F";
      if (total >= 270) grade = "A";
      else if (total >= 240) grade = "B";
      else if (total >= 210) grade = "C";

      table += `<tr>
        <td>${student.roll_number}</td>
        <td>${student.name}</td>
        <td>${student.Class.class_name}-${student.Section.section_name}</td>`;

      allColumns.forEach((col) => {
        table += `<td>${scoreMap[col] ?? ""}</td>`;
      });

      table += `<td>${total}</td><td>${grade}</td></tr>`;
    });

    table += `</tbody></table>`;

    // 🔧 Compile Handlebars with {{{table}}}
    const template = handlebars.compile(html);
    const finalHtml = template({ table });

    const filePath = path.join(__dirname, `../exports/${fileName}-${Date.now()}.pdf`);
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.setContent(finalHtml, { waitUntil: "networkidle0" });

    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "40px", left: "20px", right: "20px" },
    });

    await browser.close();

    res.download(filePath, () => {
      fs.unlinkSync(filePath);
    });
  } catch (err) {
    console.error("🔥 PDF generation error:", err);
    res.status(500).json({ message: "Failed to generate PDF", error: err.message });
  }
};
