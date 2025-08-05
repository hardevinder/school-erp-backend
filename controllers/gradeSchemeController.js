const { GradeScheme } = require("../models");
const ExcelJS = require("exceljs");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

// ✅ Get all
exports.getAllGrades = async (req, res) => {
  try {
    const grades = await GradeScheme.findAll({
      order: [["min_percent", "DESC"]],
    });
    res.status(200).json({ data: grades });
  } catch (error) {
    console.error("Get Error:", error);
    res.status(500).json({ error: "Failed to load grade schemes." });
  }
};

// ✅ Create
exports.createGradeScheme = async (req, res) => {
  try {
    const { min_percent, max_percent, grade, description } = req.body;

    if (
      min_percent == null ||
      max_percent == null ||
      !grade
    ) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const newGrade = await GradeScheme.create({
      min_percent,
      max_percent,
      grade,
      description,
    });

    res.status(201).json({ message: "Grade scheme created successfully", data: newGrade });
  } catch (error) {
    console.error("Create Error:", error);
    res.status(500).json({ error: "Failed to create grade scheme." });
  }
};

// ✅ Update
exports.updateGradeScheme = async (req, res) => {
  try {
    const { id } = req.params;
    const { min_percent, max_percent, grade, description } = req.body;

    const gradeScheme = await GradeScheme.findByPk(id);
    if (!gradeScheme) {
      return res.status(404).json({ error: "Grade scheme not found." });
    }

    await gradeScheme.update({
      min_percent,
      max_percent,
      grade,
      description,
    });

    res.status(200).json({ message: "Grade scheme updated successfully", data: gradeScheme });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ error: "Failed to update grade scheme." });
  }
};

// ✅ Delete
exports.deleteGradeScheme = async (req, res) => {
  try {
    const { id } = req.params;

    const gradeScheme = await GradeScheme.findByPk(id);
    if (!gradeScheme) {
      return res.status(404).json({ error: "Grade scheme not found." });
    }

    await gradeScheme.destroy();

    res.status(200).json({ message: "Grade scheme deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ error: "Failed to delete grade scheme." });
  }
};

// ✅ Export to Excel
exports.exportGradeSchemes = async (req, res) => {
  try {
    const grades = await GradeScheme.findAll({
      order: [["min_percent", "DESC"]],
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Grade Schemes");

    sheet.addRow(["Min Percent", "Max Percent", "Grade", "Description"]);

    if (grades.length > 0) {
      grades.forEach((grade) => {
        sheet.addRow([
          grade.min_percent,
          grade.max_percent,
          grade.grade,
          grade.description || "",
        ]);
      });
    } else {
      sheet.addRow(["", "", "", ""]);
    }

    sheet.getRow(1).font = { bold: true };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=GradeSchemes.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).json({ error: "Failed to export grade schemes." });
  }
};

// ✅ Import from Excel
exports.importGradeSchemes = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);

    const sheet = workbook.getWorksheet("Grade Schemes") || workbook.worksheets[0];
    const rows = sheet.getSheetValues();

    let importedCount = 0;
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[1] || !row[2] || !row[3]) continue;

      const [_, min, max, grade, desc] = row;

      const exists = await GradeScheme.findOne({
        where: {
          grade: grade.trim(),
          min_percent: min,
          max_percent: max,
        },
      });

      if (!exists) {
        await GradeScheme.create({
          min_percent: min,
          max_percent: max,
          grade: grade.trim(),
          description: desc ? desc.trim() : "",
        });
        importedCount++;
      }
    }

    fs.unlinkSync(req.file.path); // cleanup

    res.status(200).json({
      message: `Successfully imported ${importedCount} grade scheme(s).`,
    });
  } catch (error) {
    console.error("Import Error:", error);
    res.status(500).json({ error: "Failed to import grade schemes." });
  }
};
