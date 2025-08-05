const xlsx = require("xlsx");
const fs = require("fs");
const { sequelize } = require("../models");
const { Op } = require("sequelize");
const { Student, FeeStructure, FeeHeading, Class, Section, Concession, Transaction } = require("../models");

console.log("Loaded Models:", { Student, Class, Section, Concession });

/***************************************
 * Students APIs
 ***************************************/

// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      include: [
        {
          model: Class,
          as: "Class",
          attributes: ["id", "class_name"],
        },
        {
          model: Section,
          as: "Section",
          attributes: ["id", "section_name"],
        },
        {
          model: Concession,
          as: "Concession",
          attributes: ["id", "concession_name"],
        },
      ],
    });

    // Format the student objects with the new 'status' field
    const formattedStudents = students.map((student) => ({
      id: student.id,
      name: student.name,
      father_name: student.father_name,
      mother_name: student.mother_name,
      class_name: student.Class ? student.Class.class_name : "Unknown",
      class_id: student.Class ? student.Class.id : "Unknown",
      section_name: student.Section ? student.Section.section_name : "Unknown",
      section_id: student.Section ? student.Section.id : "Unknown",
      concession_name: student.Concession ? student.Concession.concession_name : "No Concession",
      concession_id: student.concession_id,
      admission_type: student.admission_type,
      address: student.address,
      father_phone: student.father_phone,
      mother_phone: student.mother_phone,
      aadhaar_number: student.aadhaar_number,
      admission_number: student.admission_number,
      status: student.status,
    }));

    res.status(200).json(formattedStudents);
  } catch (error) {
    console.error("Error in getAllStudents:", error);
    res.status(500).json({ error: error.message });
  }
};

// Search students by class and section
exports.searchByClassAndSection = async (req, res) => {
  try {
    const { class_id, section_id } = req.query; // Use query parameters

    if (!class_id || !section_id) {
      return res.status(400).json({
        error: "class_id and section_id are required parameters",
      });
    }

    console.log("Class ID:", class_id, "Section ID:", section_id);

    const students = await Student.findAll({
      where: { class_id, section_id },
      include: [
        {
          model: Class,
          as: "Class",
          attributes: ["id", "class_name"],
        },
        {
          model: Section,
          as: "Section",
          attributes: ["id", "section_name"],
        },
      ],
      order: [["name", "ASC"]],
    });

    if (students.length === 0) {
      return res.status(404).json({ message: "No students found for this class and section" });
    }

    res.status(200).json(students);
  } catch (error) {
    console.error("Error in searchByClassAndSection:", error);
    res.status(500).json({ error: error.message });
  }
};

// Add a new student
exports.addStudent = async (req, res) => {
  try {
    const {
      name,
      father_name,
      mother_name,
      class_id,
      section_id,
      address,
      father_phone,
      mother_phone,
      aadhaar_number,
      concession_id,
      admission_type,
    } = req.body;

    if (!["New", "Old"].includes(admission_type)) {
      return res.status(400).json({ error: "Invalid admission_type. Allowed values: New, Old" });
    }

    const lastStudent = await Student.findOne({ order: [["admission_number", "DESC"]] });
    const admission_number = lastStudent ? parseInt(lastStudent.admission_number) + 1 : 1000;

    const newStudent = await Student.create({
      admission_number,
      name,
      father_name,
      mother_name,
      class_id,
      section_id,
      address,
      father_phone,
      mother_phone,
      aadhaar_number,
      concession_id,
      admission_type,
    });

    res.status(201).json(newStudent);
  } catch (error) {
    console.error("Error in addStudent:", error);
    res.status(500).json({ error: error.message });
  }
};

// Edit student details
exports.editStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      father_name,
      mother_name,
      class_id,
      section_id,
      address,
      father_phone,
      mother_phone,
      aadhaar_number,
      concession_id,
      admission_type,
    } = req.body;

    if (!["New", "Old"].includes(admission_type)) {
      return res.status(400).json({ error: "Invalid admission_type. Allowed values: New, Old" });
    }

    const student = await Student.findByPk(id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    student.name = name;
    student.father_name = father_name;
    student.mother_name = mother_name;
    student.class_id = class_id;
    student.section_id = section_id;
    student.address = address;
    student.father_phone = father_phone;
    student.mother_phone = mother_phone;
    student.aadhaar_number = aadhaar_number;
    student.concession_id = concession_id;
    student.admission_type = admission_type;

    await student.save();
    res.status(200).json(student);
  } catch (error) {
    console.error("Error in editStudent:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a student
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findByPk(id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    await student.destroy();
    res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error in deleteStudent:", error);
    res.status(500).json({ error: error.message });
  }
};

// Toggle student status (enabled/disabled)
exports.toggleStudentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let newStatus = req.body.status; // if provided
    const student = await Student.findByPk(id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // If no new status provided, toggle the current status
    if (!newStatus) {
      newStatus = student.status === "enabled" ? "disabled" : "enabled";
    }

    if (!["enabled", "disabled"].includes(newStatus)) {
      return res.status(400).json({ message: "Invalid status value" });
    }
    
    student.status = newStatus;
    await student.save();
    res.status(200).json({ message: `Student status updated to ${newStatus}` });
  } catch (error) {
    console.error("Error in toggleStudentStatus:", error);
    res.status(500).json({ error: error.message });
  }
};

// Export students to Excel
exports.exportStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      include: [
        {
          model: Class,
          as: "Class",
          attributes: ["class_name"],
        },
        {
          model: Section,
          as: "Section",
          attributes: ["section_name"],
        },
      ],
    });

    const studentData = students.map((student) => ({
      Name: student.name,
      FatherName: student.father_name,
      MotherName: student.mother_name,
      Class: student.Class ? student.Class.class_name : "Unknown",
      Section: student.Section ? student.Section.section_name : "Unknown",
      Address: student.address,
      FatherPhone: student.father_phone,
      MotherPhone: student.mother_phone,
      Aadhaar: student.aadhaar_number,
      AdmissionNumber: student.admission_number,
      Status: student.status,
    }));

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(studentData);
    xlsx.utils.book_append_sheet(workbook, worksheet, "Students");

    const filePath = "uploads/Students.xlsx";
    xlsx.writeFile(workbook, filePath);

    res.download(filePath, "Students.xlsx", () => {
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error("Error in exportStudents:", error);
    res.status(500).json({ message: "Error exporting students" });
  }
};

// Search by Admission Number
exports.searchByAdmissionNumber = async (req, res) => {
  try {
    const { admission_number } = req.params;

    const student = await Student.findOne({
      where: { admission_number },
      include: [
        {
          model: Class,
          as: "Class",
          attributes: ["id", "class_name"],
        },
        {
          model: Section,
          as: "Section",
          attributes: ["id", "section_name"],
        },
      ],
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json(student);
  } catch (error) {
    console.error("Error in searchByAdmissionNumber:", error);
    res.status(500).json({ error: error.message });
  }
};

// Search by Class
exports.searchByClass = async (req, res) => {
  try {
    const { class_id } = req.params;

    const students = await Student.findAll({
      where: { class_id },
      include: [
        {
          model: Class,
          as: "Class",
          attributes: ["id", "class_name"],
        },
        {
          model: Section,
          as: "Section",
          attributes: ["id", "section_name"],
        },
      ],
    });

    if (students.length === 0) {
      return res.status(404).json({ message: "No students found for this class" });
    }

    res.status(200).json(students);
  } catch (error) {
    console.error("Error in searchByClass:", error);
    res.status(500).json({ error: error.message });
  }
};

// Import students from Excel
exports.importStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded!" });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    const classes = await Class.findAll({ attributes: ["id", "class_name"] });
    const sections = await Section.findAll({ attributes: ["id", "section_name"] });

    const classMap = new Map(classes.map((cls) => [cls.class_name.toLowerCase(), cls.id]));
    const sectionMap = new Map(sections.map((sec) => [sec.section_name.toLowerCase(), sec.id]));

    const newStudents = [];
    const duplicateRecords = [];

    sheetData.forEach((row) => {
      const class_id = classMap.get(row.Class.toLowerCase());
      const section_id = sectionMap.get(row.Section.toLowerCase());

      if (class_id && section_id) {
        newStudents.push({
          name: row.Name,
          father_name: row.FatherName,
          mother_name: row.MotherName,
          class_id,
          section_id,
          address: row.Address,
          father_phone: row.FatherPhone,
          mother_phone: row.MotherPhone,
          aadhaar_number: row.Aadhaar,
          admission_number: row.AdmissionNumber,
        });
      } else {
        duplicateRecords.push({ ...row, error: "Invalid Class or Section" });
      }
    });

    await Student.bulkCreate(newStudents);

    fs.unlinkSync(req.file.path);

    res.status(200).json({
      message: `${newStudents.length} students imported successfully!`,
      duplicates: duplicateRecords,
    });
  } catch (error) {
    console.error("Error in importStudents:", error);
    res.status(500).json({ message: "Error importing students" });
  }
};

/***************************************
 * Student Fee Details API
 ***************************************/

// API to get fee details for a student after concession deduction (if applicable)
const dayjs = require("dayjs");

function calculateFine(fee) {
  const today = dayjs();
  const fineStartDate = fee.fineStartDate ? dayjs(fee.fineStartDate) : null;

  if (!fineStartDate || today.isBefore(fineStartDate)) return 0;

  const due = Number(fee.feeDue || 0);

  if (fee.fineType === "percentage") {
    const percent = Number(fee.finePercentage || 0);
    return Math.ceil((percent / 100) * due);
  } else if (fee.fineType === "slab") {
    const perSlab = Number(fee.fineAmountPerSlab || 0);
    const slabDays = Number(fee.fineSlabDuration || 0);
    const daysLate = today.diff(fineStartDate, "day");
    const slabs = Math.floor(daysLate / slabDays);
    return perSlab * slabs;
  }

  return 0;
}

exports.getStudentFeeDetails = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Fetch student with Concession info
    const student = await Student.findByPk(studentId, {
      include: [
        {
          model: Concession,
          as: "Concession",
        },
      ],
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Get fee structures for student's class and admission type
    const feeStructures = await FeeStructure.findAll({
      where: {
        class_id: student.class_id,
        admissionType: {
          [Op.or]: [student.admission_type, "all"],
        },
      },
      include: [
        {
          model: FeeHeading,
          as: "FeeHeading",
        },
      ],
    });

    // Fetch total received per fee head
    const receivedTransactions = await Transaction.findAll({
      where: {
        Student_ID: student.id,
      },
      attributes: [
        "Fee_Head",
        [sequelize.fn("SUM", sequelize.col("Fee_Recieved")), "totalReceived"],
        [sequelize.fn("SUM", sequelize.col("Concession")), "totalConcession"],
      ],
      group: ["Fee_Head"],
    });


    const receivedMap = {};
    receivedTransactions.forEach((tx) => {
      receivedMap[tx.Fee_Head] = Number(tx.dataValues.totalReceived || 0);
    });

    const receivedConcessionMap = {};
    receivedTransactions.forEach((tx) => {
      receivedMap[tx.Fee_Head] = Number(tx.dataValues.totalReceived || 0);
      receivedConcessionMap[tx.Fee_Head] = Number(tx.dataValues.totalConcession || 0);
    });


    // Calculate final fee details
    const feeDetails = feeStructures.map((fee) => {
      const originalFeeDue = Number(fee.feeDue || 0);
      let concessionAmount = 0;
      let netFee = originalFeeDue;
      let concessionApplied = false;

      if (
        fee.concessionApplicable === "Yes" &&
        student.concession_id &&
        student.Concession
      ) {
        const concessionPercentage = Number(student.Concession.concession_percentage || 0);
        concessionAmount = Math.round(originalFeeDue * (concessionPercentage / 100));
        netFee = originalFeeDue - concessionAmount;
        concessionApplied = true;
      }

      // Get received amount
      const receivedAmount = receivedMap[fee.fee_heading_id] || 0;

      // Calculate actual due
      const totalConcession = receivedConcessionMap[fee.fee_heading_id] || 0;
      const actualDue = Math.max(0, netFee - receivedAmount - totalConcession);


      // Calculate fine only on remaining due
      const feeForFine = {
        ...fee.toJSON(),
        feeDue: actualDue,
      };
      const fineAmount = actualDue > 0 ? calculateFine(feeForFine) : 0;

      return {
        fee_structure_id: fee.id,
        fee_heading_id: fee.fee_heading_id,
        fee_heading: fee.FeeHeading ? fee.FeeHeading.fee_heading : null,
        original_fee_due: originalFeeDue,
        feeDue: actualDue,
        receivedAmount,
        concession_amount: concessionAmount,
        concession_applied: concessionApplied,
        fineAmount,
        transportApplicable: fee.transportApplicable,
      };
    });

    // Final response
    res.status(200).json({
      student: {
        id: student.id,
        name: student.name,
        admission_number: student.admission_number,
        class_id: student.class_id,
        admission_type: student.admission_type,
        concession: student.Concession
          ? {
              concession_id: student.concession_id,
              concession_name: student.Concession.concession_name,
              concession_percentage: student.Concession.concession_percentage,
            }
          : null,
      },
      feeDetails,
    });
  } catch (error) {
    console.error("Error in getStudentFeeDetails:", error);
    res.status(500).json({
      error: "Failed to fetch student fee details",
      details: error.message,
    });
  }
};


// Get logged in student details
exports.getLoggedInStudentDetails = async (req, res) => {
  try {
    // Assuming the authentication middleware attaches the logged in user details in req.user.
    // And that req.user.username contains the student id (as a string).
    const studentId = parseInt(req.user.username, 10);
    if (isNaN(studentId)) {
      return res.status(400).json({ error: "Invalid student identifier" });
    }

    // Find the student and include associated data from Class, Section, and Concession models.
    const student = await Student.findOne({
      where: { admission_number: studentId },
      include: [
        { model: Class, as: "Class" },
        { model: Section, as: "Section" },
        { model: Concession, as: "Concession" },
      ],
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.status(200).json({ student });
  } catch (error) {
    console.error("Error fetching student details:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};



