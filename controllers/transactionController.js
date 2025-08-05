const { Op } = require('sequelize');
const { Transaction, User, Student, Class, Section, FeeHeading, Transportation, FeeStructure, Concession, sequelize, Sequelize } = require('../models');
const admin = require('firebase-admin');

// Initialize Firebase Admin if it hasn't been initialized already
if (!admin.apps.length) {
  // Replace with the correct path to your Firebase service account key JSON file
  const serviceAccount = require('../path/to/serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}


// helper to grab roles cleanly everywhere
const roleFlags = (user) => {
  const roles = user?.roles || [user?.role].filter(Boolean);
  return {
    roles,
    isAdmin: roles?.includes("admin"),
    isSuperadmin: roles?.includes("superadmin"),
  };
};

const transactionController = {
  // Create a new transaction
  createTransaction: async (req, res) => {
    try {
      // Set the CreatedBy field from the authenticated user (for authorization)
      req.body.CreatedBy = req.user.id;
      const transaction = await Transaction.create(req.body);

      // -------------------------------------------
      // Send notification only to the user whose username (i.e. admission number) matches the fee submission
      // -------------------------------------------
      const studentAdmission = req.body.AdmissionNumber;
      if (studentAdmission) {
        // Look up the user by username (which is the admission number)
        const studentUser = await User.findOne({ where: { username: studentAdmission } });
        if (studentUser) {
          // Lookup Fee Heading details if available
          const feeHeadingRecord = transaction.Fee_Head ? await FeeHeading.findByPk(transaction.Fee_Head) : null;
          const feeHeadingName = feeHeadingRecord ? feeHeadingRecord.fee_heading : "N/A";

          // Send real-time notification using Socket.IO
          const io = req.app.get('socketio');
          if (io) {
            const notificationData = {
              title: "Fee Payment Received",
              message: `Dear ${studentUser.name}, your fee payment for ${feeHeadingName} fee has been successfully received. Total amount received: ${transaction.Fee_Recieved}.`,
              transactionId: transaction.id,
            };
            // Emit the notification to the room named after the admission number
            io.to(studentAdmission.toString()).emit('fee-notification', notificationData);
            console.log("Socket notification sent to room:", studentAdmission);
          } else {
            console.warn("Socket.io instance not found in app locals.");
          }

          // Send background (push) notification using Firebase Admin if the user has an FCM token
          if (studentUser.fcmToken) {
            const pushMessage = {
              token: studentUser.fcmToken,
              notification: {
                title: "Fee Payment Received",
                body: `Dear ${studentUser.name}, your fee payment for ${feeHeadingName} fee has been successfully received. Total amount: ${transaction.Fee_Recieved}.`
              },
              data: {
                transactionId: transaction.id.toString(),
              },
            };

            admin.messaging().send(pushMessage)
              .then((response) => {
                console.log("Push notification sent successfully:", response);
              })
              .catch((error) => {
                console.error("Error sending push notification:", error);
              });
          } else {
            console.warn("No FCM token found for user:", studentAdmission);
          }
        } else {
          console.warn("Student user not found for username:", studentAdmission);
        }
      } else {
        console.warn("AdmissionNumber not provided in transaction data.");
      }
      // -------------------------------------------
      return res.status(201).json({ success: true, data: transaction });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getAllTransactions: async (req, res) => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const transactions = await Transaction.findAll({
        where: {
          createdAt: { [Op.gte]: startOfDay },
          status: { [Op.ne]: 'cancelled' }, // ✅ move inside 'where'
        },
        include: [
          { model: Student, as: 'Student' },
          { model: Class, as: 'Class' },
          { model: Section, as: 'Section' },
          { model: FeeHeading, as: 'FeeHeading' },
          { model: Transportation, as: 'Transportation' },
        ],
        order: [['createdAt', 'DESC']],
      });

      return res.status(200).json({ success: true, data: transactions });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },


  searchByClass: async (req, res) => {
    try {
      const { classId } = req.params;
      const transactions = await Transaction.findAll({
        where: {
          status: { [Op.ne]: 'cancelled' },
        },
        include: [
          { model: Student, as: 'Student' },
          { model: Class, as: 'Class', where: { id: classId } },
          { model: Section, as: 'Section' },
          { model: FeeHeading, as: 'FeeHeading' },
          { model: Transportation, as: 'Transportation' },
        ],
      });

      if (!transactions.length) {
        return res.status(404).json({ success: false, message: 'No transactions found for this class.' });
      }

      return res.status(200).json({ success: true, data: transactions });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },


  searchByAdmissionNumber: async (req, res) => {
    try {
      const { admissionNumber } = req.params;
      const transactions = await Transaction.findAll({
        where: {
          status: { [Op.ne]: 'cancelled' },
        },
        include: [
          { model: Student, as: 'Student', where: { admission_number: admissionNumber } },
          { model: Class, as: 'Class' },
          { model: Section, as: 'Section' },
          { model: FeeHeading, as: 'FeeHeading' },
          { model: Transportation, as: 'Transportation' },
        ],
      });

      if (!transactions.length) {
        return res.status(404).json({ success: false, message: 'No transactions found for this admission number.' });
      }

      return res.status(200).json({ success: true, data: transactions });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },


  searchByClassAndSection: async (req, res) => {
    try {
      const { classId, sectionId } = req.query;

      const transactions = await Transaction.findAll({
        where: {
          status: { [Op.ne]: 'cancelled' }, // ✅ Exclude cancelled transactions
        },
        include: [
          { model: Student, as: 'Student' },
          { model: Class, as: 'Class', where: { id: classId } },
          { model: Section, as: 'Section', where: { id: sectionId } },
          { model: FeeHeading, as: 'FeeHeading' },
          { model: Transportation, as: 'Transportation' },
        ],
      });

      if (!transactions.length) {
        return res.status(404).json({ success: false, message: 'No transactions found for this class and section.' });
      }

      return res.status(200).json({ success: true, data: transactions });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },


  getTransactionById: async (req, res) => {
    try {
      const transaction = await Transaction.findByPk(req.params.id, {
        include: [
          { model: Student, as: 'Student' },
          { model: Class, as: 'Class' },
          { model: Section, as: 'Section' },
          { model: FeeHeading, as: 'FeeHeading' },
          { model: Transportation, as: 'Transportation' },
        ],
      });
      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }
      return res.status(200).json({ success: true, data: transaction });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  updateTransaction: async (req, res) => {
    try {
      const transaction = await Transaction.findByPk(req.params.id);
      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }
      // Allow both admin & superadmin to cancel (regardless of who created it)
        if (!['admin', 'superadmin'].includes(req.user.role)) {
          return res.status(403).json({ success: false, message: 'Not allowed to cancel this transaction' });
        }

      // Update the transaction
      await transaction.update(req.body);
      
      // Send notification on update
      const studentAdmission = transaction.AdmissionNumber || req.body.AdmissionNumber;
      if (studentAdmission) {
        const studentUser = await User.findOne({ where: { username: studentAdmission } });
        if (studentUser) {
          const feeHeadingRecord = transaction.Fee_Head ? await FeeHeading.findByPk(transaction.Fee_Head) : null;
          const feeHeadingName = feeHeadingRecord ? feeHeadingRecord.fee_heading : "N/A";
          
          const io = req.app.get('socketio');
          if (io) {
            const notificationData = {
              title: "Fee Payment Updated",
              message: `Dear ${studentUser.name}, your fee payment for ${feeHeadingName} has been updated. Amount Received: ${transaction.Fee_Recieved}.`,
              transactionId: transaction.id,
            };
            io.to(studentAdmission.toString()).emit('fee-notification', notificationData);
            console.log("Socket notification sent on update to room:", studentAdmission);
          } else {
            console.warn("Socket.io instance not found in app locals.");
          }
          if (studentUser.fcmToken) {
            const pushMessage = {
              token: studentUser.fcmToken,
              notification: {
                title: "Fee Payment Updated",
                body: `Dear ${studentUser.name}, your fee payment for ${feeHeadingName} has been updated. Amount Received: ${transaction.Fee_Recieved}.`
              },
              data: {
                transactionId: transaction.id.toString(),
              },
            };
            admin.messaging().send(pushMessage)
              .then(response => {
                console.log("Push notification sent successfully:", response);
              })
              .catch(error => {
                console.error("Error sending push notification:", error);
              });
          } else {
            console.warn("No FCM token found for user:", studentAdmission);
          }
        } else {
          console.warn("Student user not found for username:", studentAdmission);
        }
      } else {
        console.warn("AdmissionNumber not provided for update notification.");
      }
      
      return res.status(200).json({ success: true, data: transaction });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  createBulkTransactions: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { transactions } = req.body;

      if (!Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({ success: false, message: "No transactions provided" });
      }

      // Filter transactions: Only include those with valid amounts
      const filteredTransactions = transactions.filter(
        (transaction) =>
          transaction.Fee_Recieved > 0 ||
          transaction.Concession > 0 ||
          transaction.VanFee > 0 ||
          transaction.Van_Fee_Concession > 0
      );

      if (filteredTransactions.length === 0) {
        console.warn("No transactions were updated because all amounts were zero.");
        return res.status(200).json({
          success: true,
          message: "No transactions were updated as all amounts were zero.",
        });
      }

      // Validate PaymentMode and Transaction_ID
      const invalidTransactions = filteredTransactions.filter(
        (transaction) =>
          (transaction.PaymentMode === "Online" && !transaction.Transaction_ID) ||
          !["Cash", "Online"].includes(transaction.PaymentMode)
      );

      if (invalidTransactions.length > 0) {
        console.error("Invalid Transactions:", invalidTransactions);
        return res.status(400).json({
          success: false,
          message: "Invalid PaymentMode or missing Transaction_ID for online transactions.",
          invalidTransactions,
        });
      }

      // Fetch the current maximum Slip_ID
      const maxSlipIdResult = await Transaction.findOne({
        attributes: [[Sequelize.fn("MAX", Sequelize.col("Slip_ID")), "maxSlipId"]],
      });

      const maxSlipId = maxSlipIdResult?.dataValues?.maxSlipId || 0;
      const newSlipId = maxSlipId + 1;

      // Validate FeeHead IDs
      const feeHeadIds = [...new Set(filteredTransactions.map((t) => t.Fee_Head))];
      const validFeeHeads = await FeeHeading.findAll({
        where: { id: feeHeadIds },
        attributes: ["id"],
      });

      const validFeeHeadIds = validFeeHeads.map((f) => f.id);
      const invalidFeeHeadIds = feeHeadIds.filter((id) => !validFeeHeadIds.includes(id));

      if (invalidFeeHeadIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid Fee Head IDs detected.",
          invalidFeeHeadIds,
        });
      }

      // Assign the new Slip_ID and set CreatedBy from req.user.id
      const transactionsWithSlipId = filteredTransactions.map((transaction) => ({
        ...transaction,
        Slip_ID: newSlipId,
        Route_Number: transaction.Route_ID || null,
        VanFee: transaction.VanFee ?? 0,
        Van_Fee_Concession: transaction.Van_Fee_Concession || 0,
        CreatedBy: req.user.id,
      }));

      const createdTransactions = await Transaction.bulkCreate(transactionsWithSlipId, { transaction: t });
      await t.commit();

      // Compute the total Fee_Recieved and VanFee from filtered transactions for notification
      const totalFee = filteredTransactions.reduce(
        (acc, curr) => acc + (parseFloat(curr.Fee_Recieved) || 0),
        0
      );
      const totalVanFee = filteredTransactions.reduce(
        (acc, curr) => acc + (parseFloat(curr.VanFee) || 0),
        0
      );

      // -------------------------------------------
      // Send notification only to the user whose username matches the AdmissionNumber
      // (Assuming all transactions share the same AdmissionNumber)
      // -------------------------------------------
      const studentAdmission = filteredTransactions[0].AdmissionNumber;
      if (studentAdmission) {
        const studentUser = await User.findOne({ where: { username: studentAdmission } });
        if (studentUser) {
          const feeHeadingRecord = filteredTransactions[0].Fee_Head ? await FeeHeading.findByPk(filteredTransactions[0].Fee_Head) : null;
          const feeHeadingName = feeHeadingRecord ? feeHeadingRecord.fee_heading : "N/A";

          const io = req.app.get('socketio');
          if (io) {
            const notificationData = {
              title: "Fee Payment Received",
              message: `Dear ${studentUser.name}, your fee payment for ${feeHeadingName} fee of amount ${totalFee} and van fee of ${totalVanFee} has been successfully received.`,
              slipId: newSlipId,
            };
            io.to(studentAdmission.toString()).emit('fee-notification', notificationData);
            console.log("Socket notification sent for bulk transactions to room:", studentAdmission);
          } else {
            console.warn("Socket.io instance not found in app locals.");
          }
          if (studentUser.fcmToken) {
            const pushMessage = {
              token: studentUser.fcmToken,
              notification: {
                title: "Fee Payment Received",
                body: `Dear ${studentUser.name}, your fee payment for ${feeHeadingName} fee of amount ${totalFee} and van fee of ${totalVanFee} has been successfully received.`,
              },
              data: {
                slipId: newSlipId.toString(),
              },
            };
            admin.messaging().send(pushMessage)
              .then(response => {
                console.log("Push notification sent successfully for bulk transactions:", response);
              })
              .catch(error => {
                console.error("Error sending push notification for bulk transactions:", error);
              });
          } else {
            console.warn("No FCM token found for user:", studentAdmission);
          }
        } else {
          console.warn("Student user not found for username:", studentAdmission);
        }
      } else {
        console.warn("AdmissionNumber not provided in the bulk transaction data.");
      }
      // -------------------------------------------
      
      return res.status(201).json({
        success: true,
        message: "Transactions created successfully",
        data: createdTransactions,
        slipId: newSlipId,
      });
    } catch (error) {
      console.error("Error in createBulkTransactions:", error);
      await t.rollback();
      return res.status(500).json({ success: false, message: "Transaction creation failed.", error: error.message });
    }
  },

  // Permanent delete (superadmin only, and only if already cancelled)
deleteTransaction: async (req, res) => {
  try {
    const { id } = req.params;

    // PK is Serial, Sequelize handles it with findByPk
    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    // Use the helper so it works with req.user.role OR req.user.roles
    const { isSuperadmin } = roleFlags(req.user);
    if (!isSuperadmin) {
      return res.status(403).json({ success: false, message: "Only superadmin can delete transactions" });
    }

    if (transaction.status !== "cancelled") {
      return res.status(400).json({ success: false, message: "Only cancelled transactions can be deleted" });
    }

    await transaction.destroy();
    return res.status(200).json({ success: true, message: "Cancelled transaction permanently deleted" });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
},

  getTotalReceivedByFeeHead: async (req, res) => {
    try {
      const { studentId } = req.params;

      const totals = await Transaction.findAll({
        attributes: [
          'Fee_Head',
          [Sequelize.col('FeeHeading.fee_heading'), 'FeeHeadingName'],
          [Sequelize.fn('SUM', Sequelize.col('Fee_Recieved')), 'FeeReceived'],
          [Sequelize.fn('SUM', Sequelize.col('Concession')), 'TotalConcession'],
          [Sequelize.literal('SUM(Fee_Recieved + Concession)'), 'TotalReceived']
        ],
        include: [
          { model: FeeHeading, as: 'FeeHeading', attributes: [] },
        ],
        where: {
          Student_ID: studentId,
          status: { [Sequelize.Op.ne]: 'cancelled' }, // ✅ Exclude cancelled
        },
        group: ['Fee_Head', 'FeeHeading.fee_heading'],
        order: [[Sequelize.col('Fee_Head'), 'ASC']],
      });

      return res.status(200).json({ success: true, data: totals });
    } catch (error) {
      console.error('Error fetching totals:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },


  getDaySummary: async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const paymentSummary = await Transaction.findAll({
        attributes: [
          'PaymentMode',
          [Sequelize.fn('SUM', Sequelize.col('Fee_Recieved')), 'TotalFeeReceived'],
          [Sequelize.fn('SUM', Sequelize.col('Concession')), 'TotalConcession'],
          [Sequelize.fn('SUM', Sequelize.col('VanFee')), 'TotalVanFee'],
          [Sequelize.fn('SUM', Sequelize.col('Fine_Amount')), 'TotalFine'],
          [Sequelize.literal('SUM(Fee_Recieved + VanFee + Fine_Amount)'), 'TotalAmountCollected'],
        ],
        where: {
          createdAt: { [Op.gte]: today },
          status: { [Op.ne]: 'cancelled' }, // ✅ Exclude cancelled
        },
        group: ['PaymentMode'],
      });

      const summary = await Transaction.findAll({
        attributes: [
          'Fee_Head',
          [Sequelize.col('FeeHeading.fee_heading'), 'FeeHeadingName'],
          [Sequelize.fn('SUM', Sequelize.col('Fee_Recieved')), 'TotalFeeReceived'],
          [Sequelize.fn('SUM', Sequelize.col('Concession')), 'TotalConcession'],
          [Sequelize.fn('SUM', Sequelize.col('VanFee')), 'TotalVanFee'],
          [Sequelize.fn('SUM', Sequelize.col('Fine_Amount')), 'TotalFine'],
          [Sequelize.literal('SUM(Fee_Recieved + VanFee + Fine_Amount)'), 'TotalAmountCollected'],
        ],
        include: [{ model: FeeHeading, as: 'FeeHeading', attributes: [] }],
        where: {
          createdAt: { [Op.gte]: today },
          status: { [Op.ne]: 'cancelled' }, // ✅ Exclude cancelled
        },
        group: ['Fee_Head', 'FeeHeading.fee_heading'],
        order: [[Sequelize.col('Fee_Head'), 'ASC']],
      });

      const grandTotal = summary.reduce(
        (acc, item) => acc + parseFloat(item.dataValues.TotalAmountCollected || 0),
        0
      );

      const totalFine = summary.reduce(
        (acc, item) => acc + parseFloat(item.dataValues.TotalFine || 0),
        0
      );

      return res.status(200).json({
        success: true,
        data: summary,
        grandTotal,
        totalFine,
        paymentSummary,
      });
    } catch (error) {
      console.error('Error fetching day summary:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getVanFeeByStudentId: async (req, res) => {
    try {
      const { studentId } = req.params;

      const vanFeeData = await Transaction.findAll({
        attributes: [
          'Fee_Head',
          [Sequelize.col('FeeHeading.fee_heading'), 'FeeHeadingName'],
          [Sequelize.fn('SUM', Sequelize.col('VanFee')), 'TotalVanFeeReceived'],
          [Sequelize.fn('SUM', Sequelize.col('Van_Fee_Concession')), 'TotalVanFeeConcession'],
          [Sequelize.literal('SUM(VanFee + Van_Fee_Concession)'), 'TotalVanFeeAfterConcession']
        ],
        include: [
          { model: FeeHeading, as: 'FeeHeading', attributes: [] },
        ],
        where: {
          Student_ID: studentId,
          status: { [Sequelize.Op.ne]: 'cancelled' }, // ✅ Exclude cancelled transactions
        },
        group: ['Fee_Head', 'FeeHeading.fee_heading'],
        order: [[Sequelize.col('Fee_Head'), 'ASC']],
      });

      return res.status(200).json({ success: true, data: vanFeeData });
    } catch (error) {
      console.error('Error fetching VAN_FEE data:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },


  getLastRouteByStudentId: async (req, res) => {
    try {
      const { studentId } = req.params;
      const lastRouteData = await Transaction.findAll({
        attributes: [
          'Fee_Head',
          [Sequelize.col('FeeHeading.fee_heading'), 'FeeHeadingName'],
          'Route_Number',
          [Sequelize.fn('MAX', Sequelize.col('Transaction.createdAt')), 'LastTransactionDate'],
        ],
        include: [
          { model: FeeHeading, as: 'FeeHeading', attributes: [] },
        ],
        where: {
          Student_ID: studentId,
          Route_Number: { [Op.ne]: null },
          status: { [Op.ne]: 'cancelled' }, // ✅ Exclude cancelled
        },
        group: ['Fee_Head', 'FeeHeading.fee_heading', 'Route_Number'],
        order: [[Sequelize.fn('MAX', Sequelize.col('Transaction.createdAt')), 'DESC']],
      });
      return res.status(200).json({ success: true, data: lastRouteData });
    } catch (error) {
      console.error('Error fetching last selected route:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },


  getTransactionsBySlipId: async (req, res) => {
    try {
      const { slipId } = req.params;

      const transactions = await Transaction.findAll({
        where: {
          Slip_ID: slipId,
          status: { [Op.ne]: 'cancelled' }, // ✅ Exclude cancelled transactions
        },
        include: [
          { 
            model: Student, 
            as: 'Student',
            include: [{ model: Concession, as: 'Concession' }]
          },
          { model: Class, as: 'Class' },
          { model: Section, as: 'Section' },
          { model: FeeHeading, as: 'FeeHeading' },
          { model: Transportation, as: 'Transportation' },
        ],
        order: [['createdAt', 'ASC']],
      });

      if (!transactions.length) {
        return res.status(404).json({ success: false, message: 'No transactions found for this Slip ID.' });
      }

      const groupedByFeeHead = {};
      transactions.forEach((trx) => {
        const feeHead = trx.Fee_Head;
        if (!groupedByFeeHead[feeHead]) {
          groupedByFeeHead[feeHead] = [];
        }
        groupedByFeeHead[feeHead].push(trx);
      });

      await Promise.all(
        Object.keys(groupedByFeeHead).map(async (feeHead) => {
          const group = groupedByFeeHead[feeHead];
          const feeStructure = await FeeStructure.findOne({
            where: {
              class_id: group[0].Class_ID,
              fee_heading_id: feeHead,
            },
          });

          const feeDue = feeStructure ? parseFloat(feeStructure.feeDue) : 0;
          const concessionApplicable = feeStructure?.concessionApplicable === "Yes";
          const concessionPercentage = group[0].Student?.Concession
            ? parseFloat(group[0].Student.Concession.concession_percentage)
            : 0;

          const effectiveFeeDue = concessionApplicable
            ? feeDue * (1 - concessionPercentage / 100)
            : feeDue;

          const sumFeeReceived = await Transaction.sum('Fee_Recieved', {
            where: {
              Student_ID: group[0].Student_ID,
              Fee_Head: feeHead,
              status: { [Op.ne]: 'cancelled' }, // ✅ exclude cancelled
            },
          });

          const sumConcession = await Transaction.sum('Concession', {
            where: {
              Student_ID: group[0].Student_ID,
              Fee_Head: feeHead,
              status: { [Op.ne]: 'cancelled' }, // ✅ exclude cancelled
            },
          });

          const totalPaid = (sumFeeReceived || 0) + (sumConcession || 0);
          const feeBalance = effectiveFeeDue - totalPaid;

          group.forEach((trx) => {
            trx.dataValues.feeBalance = feeBalance;
          });
        })
      );

      transactions.forEach((transaction) => {
        const vanFeeDue = transaction.Transportation?.Cost
          ? parseFloat(transaction.Transportation.Cost)
          : 0;
        const vanFeeReceived = parseFloat(transaction.VanFee || 0);
        const vanConcession = parseFloat(transaction.Van_Fee_Concession || 0);
        transaction.dataValues.vanFeeBalance = vanFeeDue - (vanFeeReceived + vanConcession);
      });

      return res.status(200).json({ success: true, data: transactions });

    } catch (error) {
      console.error('Error fetching transactions by Slip ID:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },


  cancelTransaction: async (req, res) => {
    try {
      const transaction = await Transaction.findByPk(req.params.id);

      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      if (transaction.status === 'cancelled') {
        return res.status(400).json({ success: false, message: 'Transaction is already cancelled' });
      }

      const isSuperadmin = req.user.roles.includes('superadmin');
      const isAdmin = req.user.roles.includes('admin');

      if (transaction.CreatedBy !== req.user.id && !isSuperadmin && !isAdmin) {
        return res.status(403).json({ success: false, message: 'You are not authorized to cancel this transaction' });
      }

      transaction.status = 'cancelled';
      transaction.CancelledBy = req.user.id;
      transaction.CancelledAt = new Date();

      await transaction.save();

      return res.status(200).json({ success: true, message: 'Transaction cancelled successfully', data: transaction });
    } catch (error) {
      console.error('Error cancelling transaction:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },


// ---------- CANCELLED LIST (paged/searchable) ----------
// controller -> getCancelledTransactions
getCancelledTransactions: async (req, res) => {
  try {
    let { page = 1, limit = 20, search = "", from, to, minAmt, maxAmt } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 20;

    const where = { status: "cancelled" };

    if (from || to) {
      where.CancelledAt = {};
      if (from) where.CancelledAt[Op.gte] = new Date(`${from} 00:00:00`);
      if (to) where.CancelledAt[Op.lte] = new Date(`${to} 23:59:59`);
    }

    if (minAmt || maxAmt) {
      where.Fee_Recieved = {};
      if (minAmt) where.Fee_Recieved[Op.gte] = Number(minAmt);
      if (maxAmt) where.Fee_Recieved[Op.lte] = Number(maxAmt);
    }

    const include = [
      { model: Student, as: "Student", required: false },
      { model: Class, as: "Class", required: false },
      { model: Section, as: "Section", required: false },
      { model: FeeHeading, as: "FeeHeading", required: false },
      { model: Transportation, as: "Transportation", required: false },
      { model: User, as: "Canceller", attributes: ["id", "name", "username"], required: false },
    ];

    if (search) {
      include[0].where = {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { admission_number: { [Op.like]: `%${search}%` } },
        ],
      };
      where[Op.or] = [
        { Slip_ID: { [Op.like]: `%${search}%` } },
        { Transaction_ID: { [Op.like]: `%${search}%` } },
      ];
    }

    const offset = (page - 1) * limit;

    const { rows, count } = await Transaction.findAndCountAll({
      where,
      include,
      order: [["CancelledAt", "DESC"]],
      limit,
      offset,
    });

    const mapped = rows.map((t) => ({
      id: t.id,                        // <-- PRIMARY KEY (must exist)
      slip_id: t.Slip_ID,
      receipt_no: t.Slip_ID,
      amount: t.Fee_Recieved,
      cancelled_at: t.CancelledAt,
      cancel_reason: t.CancelReason || "",
      cancelled_by: t.Canceller?.name || "",
      student_name: t.Student?.name || "",
      admission_number: t.Student?.admission_number || "",
    }));

    return res.status(200).json({ rows: mapped, total: count });
  } catch (error) {
    console.error("Error fetching cancelled transactions:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
},
// ---------- CANCELLED LIST (paged/searchable) ----------
getCancelledTransactions: async (req, res) => {
  try {
    // Query params
    let { page = 1, limit = 20, search = "", from, to, minAmt, maxAmt } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 20;

    const where = { status: "cancelled" };

    // Date range filter
    if (from || to) {
      where.CancelledAt = {};
      if (from) where.CancelledAt[Op.gte] = new Date(`${from} 00:00:00`);
      if (to)   where.CancelledAt[Op.lte] = new Date(`${to} 23:59:59`);
    }

    // Amount range filter
    if (minAmt || maxAmt) {
      where.Fee_Recieved = {};
      if (minAmt) where.Fee_Recieved[Op.gte] = Number(minAmt);
      if (maxAmt) where.Fee_Recieved[Op.lte] = Number(maxAmt);
    }

    // Includes
    const include = [
      { model: Student, as: "Student", required: false },
      { model: Class, as: "Class", required: false },
      { model: Section, as: "Section", required: false },
      { model: FeeHeading, as: "FeeHeading", required: false },
      { model: Transportation, as: "Transportation", required: false },
      { model: User, as: "Canceller", attributes: ["id", "name", "username"], required: false },
    ];

    // Search (student/admission/slip)
    if (search) {
      include[0].where = {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { admission_number: { [Op.like]: `%${search}%` } },
        ],
      };
      where[Op.or] = [
        { Slip_ID: { [Op.like]: `%${search}%` } },
        { Transaction_ID: { [Op.like]: `%${search}%` } },
      ];
    }

    const offset = (page - 1) * limit;

    const { rows, count } = await Transaction.findAndCountAll({
      where,
      include,
      order: [["CancelledAt", "DESC"]],
      limit,
      offset,
    });

    // Map for frontend (use Serial as id)
    const mapped = rows.map((t) => ({
      id: t.Serial,                         // <--- IMPORTANT: PK is Serial
      slip_id: t.Slip_ID,
      receipt_no: t.Slip_ID,
      amount: t.Fee_Recieved,
      cancelled_at: t.CancelledAt,
      cancel_reason: t.CancelReason || "",
      cancelled_by: t.Canceller?.name || "",
      student_name: t.Student?.name || "",
      admission_number: t.Student?.admission_number || "",
    }));

    return res.status(200).json({ rows: mapped, total: count });
  } catch (error) {
    console.error("Error fetching cancelled transactions:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
},


  // ---------- RESTORE ----------
  restoreTransaction: async (req, res) => {
    try {
      const { id } = req.params;
      const transaction = await Transaction.findByPk(id);

      if (!transaction) {
        return res.status(404).json({ success: false, message: "Transaction not found." });
      }

      if (transaction.status !== "cancelled") {
        return res.status(400).json({ success: false, message: "Only cancelled transactions can be restored." });
      }

      // Auth check (both admin & superadmin allowed)
      const { isAdmin, isSuperadmin } = roleFlags(req.user);
      if (!isAdmin && !isSuperadmin) {
        return res.status(403).json({ success: false, message: "Not authorized to restore." });
      }

      await transaction.update({
        status: "completed",
        CancelledAt: null,
        CancelledBy: null,
        // Optional audit fields if you added them:
        RestoredAt: new Date(),
        RestoredBy: req.user.id,
      });

      return res.status(200).json({
        success: true,
        message: "Transaction restored successfully.",
        data: transaction,
      });
    } catch (error) {
      console.error("Error restoring transaction:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = transactionController;
