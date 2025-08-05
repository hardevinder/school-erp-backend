const { Transaction, Student, Class, FeeHeading } = require('../models');
const { Op } = require('sequelize');

exports.getConcessionReport = async (req, res) => {
  try {
    const concessions = await Transaction.findAll({
      where: {
        Concession: {
          [Op.gt]: 0,
        },
      },
      attributes: ['Student_ID', 'Fee_Head', 'Concession'],
      include: [
        {
          model: Student,
          as: 'Student',
          attributes: ['id', 'name', 'class_id'],
          include: [
            {
              model: Class,
              as: 'Class',
              attributes: ['id', 'class_name'],
            },
          ],
        },
        {
          model: FeeHeading,
          as: 'FeeHeading',
          attributes: ['fee_heading'],
        },
      ],
      raw: true,
      nest: true,
    });

    const groupedByClassId = {};

    concessions.forEach(txn => {
      const classId = txn.Student?.Class?.id || 0;
      const className = txn.Student?.Class?.class_name || 'Unknown Class';

      if (!groupedByClassId[classId]) {
        groupedByClassId[classId] = {
          classId,
          className,
          students: [],
        };
      }

      groupedByClassId[classId].students.push({
        studentName: txn.Student.name,
        feeHeading: txn.FeeHeading.fee_heading,
        concessionAmount: txn.Concession,
      });
    });

    // Convert to array and sort by classId
    const sortedResult = Object.values(groupedByClassId).sort((a, b) => a.classId - b.classId);

    return res.status(200).json(sortedResult);
  } catch (err) {
    console.error('Error generating concession report:', err);
    return res.status(500).json({ message: 'Failed to generate report', error: err.message });
  }
};
