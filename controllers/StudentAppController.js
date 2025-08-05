const { 
  Student, 
  Class, 
  Concession, 
  FeeStructure, 
  FeeHeading, 
  Transaction, 
  Section, 
  Transportation, 
  sequelize 
} = require("../models");

/**
 * StudentAppController handles endpoints related to student data and fee transactions.
 */
const StudentAppController = {
  /**
   * Get student details by admission number.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   */
  async getStudentByAdmissionNumber(req, res) {
    try {
      const { admission_number } = req.params; // Ensure your route uses "admission_number"
      if (!admission_number) {
        return res.status(400).json({ message: "Admission number is required." });
      }

      // Find student along with related Class and Concession details.
      const student = await Student.findOne({
        where: { admission_number },
        attributes: [
          "admission_number",
          "name",
          "father_name",
          "father_phone",
          "mother_name",
          "aadhaar_number",
        ],
        include: [
          {
            model: Class,
            as: "Class",
            attributes: ["class_name"],
          },
          {
            model: Concession,
            as: "Concession",
            attributes: ["concession_name"],
          },
        ],
      });

      if (!student) {
        return res.status(404).json({ message: "Student not found." });
      }

      // Format and return the response.
      const formattedStudent = {
        admission_number: student.admission_number,
        name: student.name,
        father_name: student.father_name,
        father_phone: student.father_phone,
        mother_name: student.mother_name,
        aadhaar_number: student.aadhaar_number,
        class: student.Class ? student.Class.class_name : "Not Assigned",
        concession_type: student.Concession ? student.Concession.concession_name : "No Concession",
      };

      return res.json(formattedStudent);
    } catch (error) {
      console.error("Error fetching student details:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  },

  /**
   * Get fee data for a student by admission number.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   */
  async getFeeDataByAdmissionNumber(req, res) {
    try {
      // Adjust the parameter name ("admissionNumber") to match your route if needed.
      const { admissionNumber } = req.params;
      if (!admissionNumber) {
        return res.status(400).json({ message: "Admission number is required." });
      }

      // 1. Fetch the student with their concession details.
      const student = await Student.findOne({
        where: { admission_number: admissionNumber },
        attributes: ['id', 'name', 'concession_id', 'admission_type', 'class_id'],
        include: [
          {
            model: Concession,
            as: 'Concession',
            attributes: ['concession_percentage', 'concession_name'],
          },
        ],
      });

      if (!student) {
        return res.status(404).json({ message: "Student not found." });
      }

      // 2. Fetch fee structures for the student's class.
      const feeStructures = await FeeStructure.findAll({
        where: { class_id: student.class_id },
        attributes: ['feeDue', 'fee_heading_id', 'concessionApplicable', 'admissionType'],
        include: [
          {
            model: FeeHeading,
            as: 'FeeHeading',
            attributes: ['fee_heading'],
          },
        ],
      });

      // Transform fee structures into fee head definitions.
      const feeHeads = feeStructures.map(fs => ({
        fee_heading_id: fs.fee_heading_id,
        fee_heading: fs.FeeHeading?.fee_heading || "N/A",
        feeDue: fs.feeDue,
        concessionApplicable: fs.concessionApplicable, // "Yes" or "No"
        admissionType: fs.admissionType  // e.g., "New", "Old", or "all"
      }));

      // 3. Aggregate transactions for the student.
      const transactions = await Transaction.findAll({
        where: {
          Student_ID: student.id,
          Class_ID: student.class_id,
        },
        attributes: [
          'Student_ID',
          'Fee_Head',
          [sequelize.fn('SUM', sequelize.col('Fee_Recieved')), 'totalFeeReceived'],
          [sequelize.fn('SUM', sequelize.col('VanFee')), 'totalVanFeeReceived'],
          [sequelize.fn('SUM', sequelize.col('Concession')), 'totalConcession']
        ],
        group: ['Student_ID', 'Fee_Head'],
        raw: true,
      });

      // 4. Build a map for transactions: fee_heading_id => aggregated totals.
      const transactionMap = transactions.reduce((acc, tran) => {
        acc[tran.Fee_Head] = {
          totalFeeReceived: parseFloat(tran.totalFeeReceived) || 0,
          totalVanFeeReceived: parseFloat(tran.totalVanFeeReceived) || 0,
          totalConcession: parseFloat(tran.totalConcession) || 0,
        };
        return acc;
      }, {});

      // 5. For each fee head, calculate fee details for the student.
      const feeDetails = feeHeads.map(head => {
        // Calculate effective fee due (apply concession if applicable).
        let effectiveFeeDue = head.feeDue;
        if (head.concessionApplicable === "Yes" && student.Concession) {
          const discount = head.feeDue * (student.Concession.concession_percentage / 100);
          effectiveFeeDue = head.feeDue - discount;
        }
        
        // Retrieve transaction data for this fee head.
        const txn = transactionMap[head.fee_heading_id] || {};
        const totalFeeReceived = txn.totalFeeReceived || 0;
        const totalVanFeeReceived = txn.totalVanFeeReceived || 0;
        const totalConcessionReceived = txn.totalConcession || 0;

        // Calculate the final amount due.
        let finalAmountDue = effectiveFeeDue - (totalFeeReceived + totalConcessionReceived);
        finalAmountDue = finalAmountDue < 0 ? 0 : finalAmountDue;
        
        // Return the fee detail object including fee_heading_id.
        return {
          fee_heading_id: head.fee_heading_id,  // This is now sent as part of feeDetails.
          fee_heading: head.fee_heading,
          originalFeeDue: head.feeDue,
          effectiveFeeDue,
          totalFeeReceived,
          totalVanFeeReceived,
          totalConcessionReceived,
          finalAmountDue,
          admissionType: head.admissionType,
        };
      });

      // 6. Attach the fee details to the student data.
      const studentData = student.toJSON();
      studentData.feeDetails = feeDetails;

      // 7. Return the student fee data.
      return res.status(200).json(studentData);
    } catch (error) {
      console.error("Error fetching fee data by admission number:", error);
      return res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  /**
   * Search transactions by admission number.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   */
  async searchByAdmissionNumber(req, res) {
    try {
      const { admissionNumber } = req.params;
      if (!admissionNumber) {
        return res.status(400).json({ success: false, message: "Admission number is required." });
      }

      const transactions = await Transaction.findAll({
        include: [
          { model: Student, as: 'Student', where: { admission_number: admissionNumber } },
          { model: Class, as: 'Class' },
          { model: Section, as: 'Section' },
          { model: FeeHeading, as: 'FeeHeading' },
          { model: Transportation, as: 'Transportation' },
        ],
      });

      if (!transactions || transactions.length === 0) {
        return res.status(404).json({ success: false, message: 'No transactions found for this admission number.' });
      }
      return res.status(200).json({ success: true, data: transactions });
    } catch (error) {
      console.error("Error searching transactions by admission number:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = StudentAppController;
