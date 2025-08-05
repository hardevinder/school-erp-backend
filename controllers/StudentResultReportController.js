const puppeteer = require("puppeteer");
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
    const {
      html,
      filters,
      fileName = "ClasswiseResultReport",
      orientation = "portrait", // default to portrait
    } = req.body;

    if (
      !html ||
      !filters ||
      !filters.class_id ||
      !filters.section_id ||
      !filters.exam_id
    ) {
      return res.status(400).json({ message: "Missing required data" });
    }

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // 🧠 Wrap provided content with full HTML and print-friendly styles
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              padding: 20px;
            }
            h3 {
              text-align: center;
              margin: 0 0 20px 0;
              font-size: 16px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #000;
              padding: 6px;
              text-align: center;
            }
            .text-start {
              text-align: left;
            }
            thead {
              display: table-header-group; /* repeat on each page */
            }
            tfoot {
              display: table-footer-group;
            }
            tr {
              page-break-inside: avoid;
            }
            .page-break {
              page-break-after: always;
            }
            .footer {
              margin-top: 40px;
              text-align: right;
              font-style: italic;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    await page.setContent(fullHtml, {
      waitUntil: "networkidle0",
      timeout: 0,
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: orientation === "landscape",
      printBackground: true,
      margin: {
        top: "40px",
        bottom: "40px",
        left: "20px",
        right: "20px",
      },
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
    console.error("PDF generation failed:", error);
    res.status(500).json({
      message: "Failed to generate PDF",
      error: error.message,
    });
  }
};
