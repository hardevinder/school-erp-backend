// Import all the required models
const { Transaction, FeeHeading, FeeCategory, Student, Class, sequelize } = require('../models');
const { Op } = require('sequelize');

// Returns a day-wise report with student and fee category breakdown based on date filters.
// In the JSON response, the createdAt field includes both date and time (using MIN as the representative timestamp).
exports.getDayWiseReport = async (req, res) => {
  try {
    let { startDate, endDate } = req.query;

    const formattedStartDate = startDate ? new Date(startDate).toISOString().slice(0, 10) : null;
    const formattedEndDate = endDate ? new Date(endDate).toISOString().slice(0, 10) : null;

    const whereClause = {
      status: { [Op.ne]: 'cancelled' }  // ✅ Exclude cancelled transactions
    };

    if (formattedStartDate && formattedEndDate) {
      whereClause[Op.and] = [
        sequelize.where(
          sequelize.fn('DATE', sequelize.col('Transaction.createdAt')),
          { [Op.between]: [formattedStartDate, formattedEndDate] }
        )
      ];
    }

    const report = await Transaction.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn('MIN', sequelize.col('Transaction.createdAt')), 'createdAt'],
        [sequelize.fn('MIN', sequelize.col('Transaction.Transaction_ID')), 'Transaction_ID'],
        'Slip_ID',
        'Student_ID',
        [sequelize.fn('MIN', sequelize.col('Transaction.PaymentMode')), 'PaymentMode'],
        [sequelize.fn('SUM', sequelize.col('Fee_Recieved')), 'totalFeeReceived'],
        [sequelize.fn('SUM', sequelize.col('Concession')), 'totalConcession'],
        [sequelize.fn('SUM', sequelize.col('VanFee')), 'totalVanFee'],
        [sequelize.fn('SUM', sequelize.col('Van_Fee_Concession')), 'totalVanFeeConcession'],
        [sequelize.fn('SUM', sequelize.col('Fine_Amount')), 'totalFine'],
        [sequelize.col('FeeHeading.fee_heading'), 'feeHeadingName'],
        [sequelize.col('FeeHeading.FeeCategory.name'), 'feeCategoryName'],
      ],
      include: [
        {
          model: Student,
          as: 'Student',
          attributes: ['id', 'name', 'admission_number'],
          include: [
            {
              model: Class,
              as: 'Class',
              attributes: ['id', 'class_name']
            }
          ]
        },
        {
          model: FeeHeading,
          as: 'FeeHeading',
          attributes: [],
          include: [{
            model: FeeCategory,
            as: 'FeeCategory',
            attributes: []
          }]
        }
      ],
      group: [
        sequelize.fn('DATE', sequelize.col('Transaction.createdAt')),
        'Slip_ID',
        'Student_ID',
        'FeeHeading.fee_heading',
        'FeeHeading.FeeCategory.id',
        'FeeHeading.FeeCategory.name'
      ],
      order: [[sequelize.literal('createdAt'), 'ASC']]
    });

    const io = req.app.get('socketio');
    if (io) {
      io.emit('reportUpdate', { reportType: 'DAY_WISE_REPORT', data: report });
    }

    res.status(200).json(report);
  } catch (error) {
    console.error("Error generating day-wise report:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


exports.getCompleteReport = async (req, res) => {
  try {
    const report = await Transaction.findAll({
      where: {
        status: { [Op.ne]: 'cancelled' } // ✅ Exclude cancelled
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('Transaction.createdAt')), 'transactionDate'],
        'Student_ID',
        [sequelize.fn('SUM', sequelize.col('Fee_Recieved')), 'totalFeeReceived'],
        [sequelize.fn('SUM', sequelize.col('Concession')), 'totalConcession'],
        [sequelize.fn('SUM', sequelize.col('VanFee')), 'totalVanFee'],
        [sequelize.fn('SUM', sequelize.col('Van_Fee_Concession')), 'totalVanFeeConcession'],
        [sequelize.col('FeeHeading.name'), 'feeHeadingName'],
        [sequelize.col('FeeHeading.FeeCategory.name'), 'feeCategoryName'],
        [sequelize.fn('SUM', sequelize.col('Fine_Amount')), 'totalFine']
      ],
      include: [
        {
          model: Student,
          as: 'Student',
          attributes: ['id', 'name']
        },
        {
          model: FeeHeading,
          as: 'FeeHeading',
          attributes: [],
          include: [{
            model: FeeCategory,
            as: 'FeeCategory',
            attributes: []
          }]
        }
      ],
      group: [
        sequelize.fn('DATE', sequelize.col('Transaction.createdAt')),
        'Student_ID',
        'FeeHeading.name',
        'FeeHeading.FeeCategory.id',
        'FeeHeading.FeeCategory.name'
      ],
      order: [[sequelize.literal('transactionDate'), 'ASC']]
    });

    const io = req.app.get('socketio');
    if (io) {
      io.emit('reportUpdate', { reportType: 'COMPLETE_REPORT', data: report });
    }

    res.status(200).json(report);
  } catch (error) {
    console.error("Error generating complete report:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


exports.getCurrentMonthReport = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const whereClause = sequelize.where(
      sequelize.fn('DATE', sequelize.col('Transaction.createdAt')),
      { [Op.between]: [startOfMonth, endOfMonth] }
    );

    const report = await Transaction.findAll({
      where: {
        [Op.and]: [
          whereClause,
          { status: { [Op.ne]: 'cancelled' } } // ✅ Exclude cancelled
        ]
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('Transaction.createdAt')), 'transactionDate'],
        [sequelize.fn('SUM', sequelize.col('Fee_Recieved')), 'totalFeeReceived'],
        [sequelize.fn('SUM', sequelize.col('Concession')), 'totalConcession'],
        [sequelize.fn('SUM', sequelize.col('VanFee')), 'totalVanFee'],
        [sequelize.fn('SUM', sequelize.col('Van_Fee_Concession')), 'totalVanFeeConcession'],
        [sequelize.col('FeeHeading.FeeCategory.name'), 'feeCategoryName'],
        [sequelize.fn('SUM', sequelize.col('Fine_Amount')), 'totalFine']
      ],
      include: [
        {
          model: FeeHeading,
          as: 'FeeHeading',
          attributes: [],
          include: [{
            model: FeeCategory,
            as: 'FeeCategory',
            attributes: []
          }]
        }
      ],
      group: [
        sequelize.fn('DATE', sequelize.col('Transaction.createdAt')),
        'FeeHeading.FeeCategory.id',
        'FeeHeading.FeeCategory.name'
      ],
      order: [[sequelize.literal('transactionDate'), 'ASC']]
    });

    const io = req.app.get('socketio');
    if (io) {
      io.emit('reportUpdate', { reportType: 'CURRENT_MONTH_REPORT', data: report });
    }

    res.status(200).json(report);
  } catch (error) {
    console.error("Error generating current month report:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Returns a day-wise summary for the current month with fee category breakdown.
// This will return one row per day per fee category.
exports.getDayWiseSummary = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const whereClause = sequelize.where(
      sequelize.fn('DATE', sequelize.col('Transaction.createdAt')),
      { [Op.between]: [startOfMonth, endOfMonth] }
    );

    const report = await Transaction.findAll({
      where: {
        [Op.and]: [
          whereClause,
          { status: { [Op.ne]: 'cancelled' } } // ✅ Exclude cancelled
        ]
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('Transaction.createdAt')), 'transactionDate'],
        [sequelize.fn('SUM', sequelize.col('Fee_Recieved')), 'totalFeeReceived'],
        [sequelize.fn('SUM', sequelize.col('Concession')), 'totalConcession'],
        [sequelize.fn('SUM', sequelize.col('VanFee')), 'totalVanFee'],
        [sequelize.fn('SUM', sequelize.col('Van_Fee_Concession')), 'totalVanFeeConcession'],
        [sequelize.col('FeeHeading.FeeCategory.name'), 'feeCategoryName'],
        [sequelize.fn('SUM', sequelize.col('Fine_Amount')), 'totalFine']
      ],
      include: [
        {
          model: FeeHeading,
          as: 'FeeHeading',
          attributes: [],
          include: [{
            model: FeeCategory,
            as: 'FeeCategory',
            attributes: []
          }]
        }
      ],
      group: [
        sequelize.fn('DATE', sequelize.col('Transaction.createdAt')),
        'FeeHeading.FeeCategory.id',
        'FeeHeading.FeeCategory.name'
      ],
      order: [[sequelize.literal('transactionDate'), 'ASC']]
    });

    const io = req.app.get('socketio');
    if (io) {
      io.emit('reportUpdate', { reportType: 'DAY_WISE_SUMMARY', data: report });
    }

    res.status(200).json(report);
  } catch (error) {
    console.error("Error generating day-wise summary:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// New function to count distinct students from the Transactions table,
// grouped by the student's class and by admission type ("New" or "Old").
// This assumes the Student model has an association with Class (alias "Class")
// and that Student has a field named "admission_type".
exports.getClassWiseStudentCount = async (req, res) => {
  try {
    const report = await Transaction.findAll({
      where: {
        status: { [Op.ne]: 'cancelled' } // ✅ Exclude cancelled transactions
      },
      attributes: [
        [sequelize.col('Student->Class.id'), 'classId'],
        [sequelize.col('Student->Class.class_name'), 'className'],
        [sequelize.col('Student.admission_type'), 'admissionType'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Transaction.Student_ID'))), 'studentCount'],
      ],
      include: [
        {
          model: Student,
          as: 'Student',
          attributes: [],
          where: {
            status: 'enabled' // ✅ Include only enabled students
          },
          include: [
            {
              model: Class,
              as: 'Class',
              attributes: []
            }
          ]
        }
      ],
      group: ['Student->Class.id', 'Student->Class.class_name', 'Student.admission_type'],
      order: [[sequelize.col('Student->Class.id'), 'ASC']]
    });

    const io = req.app.get('socketio');
    if (io) {
      io.emit('reportUpdate', { reportType: 'CLASS_WISE_STUDENT_COUNT', data: report });
    }

    res.status(200).json(report);
  } catch (error) {
    console.error("Error generating class-wise student count:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
