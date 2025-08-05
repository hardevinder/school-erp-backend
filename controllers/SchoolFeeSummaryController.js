// Import models
const { Student, FeeStructure, FeeHeading, Transaction, Concession, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.getSchoolFeeSummary = async (req, res) => {
  try {
    // 1. Get student IDs who have any transaction
    const activeStudentIds = await Transaction.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('Student_ID')), 'Student_ID']],
      raw: true,
    });
    const activeIds = activeStudentIds.map(s => s.Student_ID);

    // 2. Get those students with their concessions, EXCLUDE disabled students
    const students = await Student.findAll({
      where: {
        id: activeIds,
        status: 'enabled', // ✅ Exclude disabled students
      },
      attributes: ['id', 'class_id', 'admission_type', 'concession_id'],
      include: [
        {
          model: Concession,
          as: 'Concession',
          attributes: ['concession_percentage'],
        },
      ],
      raw: true,
      nest: true,
    });

    // 3. Get all fee structures with fee headings
    const feeStructures = await FeeStructure.findAll({
      attributes: ['class_id', 'fee_heading_id', 'feeDue', 'concessionApplicable', 'admissionType'],
      include: [
        {
          model: FeeHeading,
          as: 'FeeHeading',
          attributes: ['fee_heading'],
        },
      ],
      raw: true,
      nest: true,
    });

    // 4. Get all transactions
    const transactions = await Transaction.findAll({
      attributes: [
        'Student_ID',
        'Fee_Head',
        [sequelize.fn('SUM', sequelize.col('Fee_Recieved')), 'paid'],
        [sequelize.fn('SUM', sequelize.col('Concession')), 'concession'],
        [sequelize.fn('SUM', sequelize.col('VanFee')), 'vanFee'],
      ],
      group: ['Student_ID', 'Fee_Head'],
      raw: true,
    });

    // 5. Build a transaction map: studentId_feeHeadId => { paid, concession, vanFee }
    const txnMap = {};
    transactions.forEach(txn => {
      const key = `${txn.Student_ID}_${txn.Fee_Head}`;
      txnMap[key] = {
        paid: parseFloat(txn.paid || 0),
        concession: parseFloat(txn.concession || 0),
        vanFee: parseFloat(txn.vanFee || 0),
      };
    });

    // 6. Compute aggregates
    const aggregateMap = {};

    students.forEach(student => {
      const applicableFeeHeads = feeStructures.filter(fs =>
        fs.class_id === student.class_id &&
        (fs.admissionType.toLowerCase() === 'all' || fs.admissionType === student.admission_type)
      );

      applicableFeeHeads.forEach(fs => {
        const feeHeadId = fs.fee_heading_id;
        const feeHeadName = fs.FeeHeading.fee_heading;
        let feeDue = fs.feeDue;

        if (fs.concessionApplicable === 'Yes' && student.Concession?.concession_percentage) {
          const discount = feeDue * (student.Concession.concession_percentage / 100);
          feeDue -= discount;
        }

        if (!aggregateMap[feeHeadId]) {
          aggregateMap[feeHeadId] = {
            fee_heading: feeHeadName,
            totalDue: 0,
            totalReceived: 0,
            totalConcession: 0,
            studentsPaidFull: 0,
            studentsPaidPartial: 0,
            studentsPending: 0,
            vanFeeReceived: 0,
            vanStudentIds: new Set(), // ✅ Track unique student IDs
            id: feeHeadId,
          };
        }

        aggregateMap[feeHeadId].totalDue += feeDue;

        const txnKey = `${student.id}_${feeHeadId}`;
        const txn = txnMap[txnKey];
        const paid = txn ? txn.paid : 0;
        const concession = txn ? txn.concession : 0;
        const vanFee = txn ? txn.vanFee : 0;
        const totalPaid = paid + concession;

        aggregateMap[feeHeadId].totalReceived += paid;
        aggregateMap[feeHeadId].totalConcession += concession;
        aggregateMap[feeHeadId].vanFeeReceived += vanFee;

        if (vanFee > 0) {
          aggregateMap[feeHeadId].vanStudentIds.add(student.id); // ✅ Unique van student
        }

        const remainingDue = feeDue - totalPaid;

        if (totalPaid === 0) {
          aggregateMap[feeHeadId].studentsPending += 1;
        } else if (totalPaid >= feeDue - 0.5) {
          aggregateMap[feeHeadId].studentsPaidFull += 1;
        } else {
          aggregateMap[feeHeadId].studentsPaidPartial += 1;
        }
      });
    });

    // 7. Format final result
    const result = Object.values(aggregateMap).map(entry => ({
      id: entry.id,
      fee_heading: entry.fee_heading,
      totalDue: Math.round(entry.totalDue),
      totalReceived: Math.round(entry.totalReceived),
      totalConcession: Math.round(entry.totalConcession),
      totalRemainingDue: Math.round(entry.totalDue - (entry.totalReceived + entry.totalConcession)),
      studentsPaidFull: entry.studentsPaidFull,
      studentsPaidPartial: entry.studentsPaidPartial,
      studentsPending: entry.studentsPending,
      vanFeeReceived: Math.round(entry.vanFeeReceived || 0),
      vanStudents: entry.vanStudentIds ? entry.vanStudentIds.size : 0,
    }));

    // 8. Add separate Van Fee total row
    const vanFeeSummary = await Transaction.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('VanFee')), 'vanFeeReceived'],
        [sequelize.fn('SUM', sequelize.col('Van_Fee_Concession')), 'vanFeeConcession'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Student_ID'))), 'vanStudents'],
      ],
      where: {
        VanFee: {
          [Op.gt]: 0,
        },
      },
      raw: true,
    });

    const vanFeeReceived = parseFloat(vanFeeSummary[0].vanFeeReceived || 0);
    const vanFeeConcession = parseFloat(vanFeeSummary[0].vanFeeConcession || 0);
    const vanStudents = parseInt(vanFeeSummary[0].vanStudents || 0);

    const vanFeeResult = {
      fee_heading: 'Van Fee',
      totalDue: 0,
      totalReceived: Math.round(vanFeeReceived),
      totalConcession: Math.round(vanFeeConcession),
      totalRemainingDue: 0,
      studentsPaidFull: null,
      studentsPaidPartial: null,
      studentsPending: null,
      vanFeeReceived: null,
      vanStudents: vanStudents,
    };

    result.push(vanFeeResult);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in school summary:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
