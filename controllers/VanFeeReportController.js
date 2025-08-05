const { Transaction, Student, Class, FeeHeading, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.getVanFeeDetailedReport = async (req, res) => {
  try {
    // Step 1: Fetch all van fee transactions with student and heading info
    const vanFeeTransactions = await Transaction.findAll({
      where: {
        VanFee: { [Op.gt]: 0 } // Only where Van Fee was paid
      },
      attributes: ['VanFee', 'Fee_Head'], // Include Fee_Head (ID)
      include: [
        {
          model: Student,
          as: 'Student',
          attributes: ['name', 'class_id'],
          include: [
            {
              model: Class,
              as: 'Class',
              attributes: ['class_name']
            }
          ]
        },
        {
          model: FeeHeading,
          as: 'FeeHeading',
          attributes: ['fee_heading']
        }
      ],
      raw: true,
      nest: true
    });

    // Step 2: Group by class (with class_id)
    const grouped = {};

    vanFeeTransactions.forEach(trx => {
      const className = trx.Student.Class.class_name;
      const classId = trx.Student.class_id;

      if (!grouped[classId]) {
        grouped[classId] = {
          classId,
          className,
          students: []
        };
      }

      grouped[classId].students.push({
        studentName: trx.Student.name,
        feeHeading: trx.FeeHeading.fee_heading,
        feeHeadingId: trx.Fee_Head,
        vanFeePaid: trx.VanFee
      });
    });

    // Step 3: Sort fee headings per student (optional at frontend)
    // Step 4: Return data sorted by classId
    const result = Object.values(grouped).sort((a, b) => a.classId - b.classId);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Van Fee Detailed Report Error:", error);
    return res.status(500).json({
      message: "Failed to generate van fee detailed report",
      error: error.message
    });
  }
};
