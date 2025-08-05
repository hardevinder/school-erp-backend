// Import your models. Adjust the path as necessary.
const { Student, FeeStructure, FeeHeading, Transaction, Concession, sequelize } = require('../models');

exports.getFeeDataByClass = async (req, res) => {
  const { classId } = req.params;
  try {
    // 1. Fetch students for the given class ID along with their concession details and admission_type.
    const students = await Student.findAll({
      where: { class_id: classId, status: 'enabled' },  
      attributes: ['id', 'name', 'concession_id', 'admission_type'],
      include: [
        {
          model: Concession,
          as: 'Concession',
          attributes: ['concession_percentage', 'concession_name'],
        },
      ],
    });

    // 2. Fetch fee structures for the given class ID, including FeeHeading details.
    //    Also include the "concessionApplicable" flag and the admissionType from FeeStructure.
    const feeStructures = await FeeStructure.findAll({
      where: { class_id: classId },
      attributes: ['feeDue', 'fee_heading_id', 'concessionApplicable', 'admissionType'],
      include: [
        {
          model: FeeHeading,
          as: 'FeeHeading',
          attributes: ['fee_heading'],
        },
      ],
    });

    // Transform feeStructures into an array of fee head definitions.
    const feeHeads = feeStructures.map(fs => ({
      fee_heading_id: fs.fee_heading_id,
      fee_heading: fs.FeeHeading.fee_heading,
      feeDue: fs.feeDue,
      concessionApplicable: fs.concessionApplicable, // "Yes" or "No"
      admissionType: fs.admissionType  // e.g., "New", "Old", or "all"
    }));

    // 3. Get the list of student IDs.
    const studentIds = students.map(student => student.id);

    // 4. Aggregate transactions grouped by Student_ID and Fee_Head.
    const transactions = await Transaction.findAll({
      where: {
        Student_ID: studentIds,
        // Class_ID: classId,
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

    // 5. Build a nested map: studentId => { fee_heading_id => { aggregated totals } }
    const transactionMap = {};
    transactions.forEach(tran => {
      const studentId = tran.Student_ID;
      const feeHeadId = tran.Fee_Head;
      if (!transactionMap[studentId]) {
        transactionMap[studentId] = {};
      }
      transactionMap[studentId][feeHeadId] = {
        totalFeeReceived: parseFloat(tran.totalFeeReceived) || 0,
        totalVanFeeReceived: parseFloat(tran.totalVanFeeReceived) || 0,
        totalConcession: parseFloat(tran.totalConcession) || 0,
      };
    });

    // 6. For each student, attach fee details for each fee head.
    const studentsWithFeeHeads = students.map(student => {
      const studentData = student.toJSON();

      studentData.feeDetails = feeHeads.map(head => {
        // Calculate effective fee due (apply concession if applicable).
        let effectiveFeeDue = head.feeDue;
        if (head.concessionApplicable === "Yes" && studentData.Concession) {
          const discount = head.feeDue * (studentData.Concession.concession_percentage / 100);
          effectiveFeeDue = head.feeDue - discount;
        }
        
        // Get transaction data for this fee head for the student (if available).
        const txn = transactionMap[studentData.id] && transactionMap[studentData.id][head.fee_heading_id];
        const totalFeeReceived = txn ? txn.totalFeeReceived : 0;
        const totalConcessionReceived = txn ? txn.totalConcession : 0;
        const totalVanFeeReceived = txn ? txn.totalVanFeeReceived : 0;

        // Calculate final amount due.
        let finalAmountDue = effectiveFeeDue - (totalFeeReceived + totalConcessionReceived);
        if (finalAmountDue < 0) {
          finalAmountDue = 0;
        }
        
        // NEW CONDITION:
        // Return the final_due only if:
        //   - The student's admission_type matches the fee head's admissionType, OR
        //   - The fee head's admissionType is "all" (case insensitive)
        // Otherwise, set finalAmountDue to a blank string.
        if (
          !(
            studentData.admission_type === head.admissionType ||
            head.admissionType.toLowerCase() === "all"
          )
        ) {
          finalAmountDue = "";
        }

        return {
          fee_heading: head.fee_heading,
          originalFeeDue: head.feeDue,
          effectiveFeeDue,
          totalFeeReceived,
          totalVanFeeReceived,
          totalConcessionReceived,
          finalAmountDue,
          admissionType: head.admissionType // Include the fee head's admissionType in the response.
        };
      });
      return studentData;
    });

    // 7. Filter students to return only those with at least one transaction.
    const filteredStudents = studentsWithFeeHeads.filter(student => transactionMap[student.id] !== undefined);

    // 8. Return the final combined (filtered) data.
    return res.status(200).json(filteredStudents);
  } catch (error) {
    console.error("Error fetching fee data by class:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
