// controllers/feeController.js

const {
  Student,
  Class,
  FeeStructure,
  FeeHeading,
  Transaction,
  Concession,
  sequelize,
} = require('../models');

exports.getFeeHeadingWiseStudentDetails = async (req, res) => {
  const { feeHeadingId, status } = req.query;

  if (
    !feeHeadingId ||
    !['full', 'partial', 'unpaid'].includes(status)
  ) {
    return res.status(400).json({
      message:
        'feeHeadingId and valid status (full, partial, unpaid) are required',
    });
  }

  try {
    // Step 1: Load required data in parallel
    const [students, feeStructures, txnsRaw] = await Promise.all([
      Student.findAll({
        where: { status: 'enabled' },
        attributes: [
          'id',
          'name',
          'admission_number',
          'class_id',
          'admission_type',
          'concession_id',
        ],
        include: [
          {
            model: Class,
            as: 'Class',
            attributes: [['class_name', 'className']],
          },
          {
            model: Concession,
            as: 'Concession',
            attributes: ['concession_percentage'],
          },
        ],
        raw: true,
        nest: true,
      }),

      FeeStructure.findAll({
        attributes: [
          'class_id',
          'fee_heading_id',
          'feeDue',
          'concessionApplicable',
          'admissionType',
        ],
        include: [
          {
            model: FeeHeading,
            as: 'FeeHeading',
            attributes: ['fee_heading'],
          },
        ],
        raw: true,
        nest: true,
      }),

      Transaction.findAll({
        attributes: [
          'Student_ID',
          'Fee_Head',
          [sequelize.fn('SUM', sequelize.col('Fee_Recieved')), 'paid'],
          [sequelize.fn('SUM', sequelize.col('Concession')), 'concession'],
        ],
        group: ['Student_ID', 'Fee_Head'],
        raw: true,
      }),
    ]);

    // Step 2a: Build map of sums per student & fee-heading
    const txnMap = {};
    // Step 2b: Build set of students who have ANY transaction record
    const hasAnyTxn = new Set();

    txnsRaw.forEach((t) => {
      const key = `${t.Student_ID}_${t.Fee_Head}`;
      txnMap[key] = {
        paid: +t.paid || 0,
        concession: +t.concession || 0,
      };
      hasAnyTxn.add(t.Student_ID);
    });

    // Step 3: Helper to build full fee details per student
    const buildFeeDetails = (stu) => {
      return feeStructures
        .filter(
          (fs) =>
            fs.class_id === stu.class_id &&
            (fs.admissionType.toLowerCase() === 'all' ||
             fs.admissionType === stu.admission_type)
        )
        .map((fs) => {
          // Apply concession if applicable
          let due = fs.feeDue;
          if (
            fs.concessionApplicable === 'Yes' &&
            stu.Concession?.concession_percentage
          ) {
            due -= due * (stu.Concession.concession_percentage / 100);
          }

          const key = `${stu.id}_${fs.fee_heading_id}`;
          const t = txnMap[key] || {};
          const paid = t.paid || 0;
          const conc = t.concession || 0;

          return {
            fee_heading: fs.FeeHeading.fee_heading,
            due: Math.round(due),
            paid: Math.round(paid),
            concession: Math.round(conc),
            remaining: Math.round(Math.max(due - (paid + conc), 0)),
          };
        });
    };

    // Step 4: Filter students by feeHeadingId and status
    const selectedStudents = [];

    for (const stu of students) {
      // Find the matching fee structure for this heading
      const fs = feeStructures.find(
        (f) =>
          f.fee_heading_id == feeHeadingId &&
          f.class_id === stu.class_id &&
          (f.admissionType.toLowerCase() === 'all' ||
           f.admissionType === stu.admission_type)
      );
      if (!fs) continue;

      // Compute due after concession
      let due = fs.feeDue;
      if (
        fs.concessionApplicable === 'Yes' &&
        stu.Concession?.concession_percentage
      ) {
        due -= due * (stu.Concession.concession_percentage / 100);
      }

      // Pull transaction info for this heading (if any)
      const key = `${stu.id}_${feeHeadingId}`;
      const t = txnMap[key];
      const paid = t?.paid || 0;
      const conc = t?.concession || 0;
      const totalPaid = paid + conc;

      // Only include in "unpaid" if student has at least one transaction anywhere
      const matches =
        (status === 'unpaid' && totalPaid === 0 && hasAnyTxn.has(stu.id)) ||
        (status === 'full' && totalPaid >= due - 0.5) ||
        (status === 'partial' &&
          totalPaid > 0 &&
          totalPaid < due - 0.5);

      if (matches) {
        selectedStudents.push({
          id: stu.id,
          name: stu.name,
          admissionNumber: stu.admission_number,
          className: stu.Class?.className || stu.class_id,
          feeDetails: buildFeeDetails(stu),
        });
      }
    }

    return res.status(200).json({
      count: selectedStudents.length,
      data: selectedStudents,
    });
  } catch (err) {
    console.error('getFeeHeadingWiseStudentDetails error:', err);
    return res.status(500).json({
      message: 'Internal server error',
      error: err.message,
    });
  }
};
