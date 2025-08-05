'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    static associate(models) {
      // Existing associations
      Transaction.belongsTo(models.Student, { foreignKey: 'Student_ID', as: 'Student' });
      Transaction.belongsTo(models.Class, { foreignKey: 'Class_ID', as: 'Class' });
      Transaction.belongsTo(models.Section, { foreignKey: 'Section_ID', as: 'Section' });
      Transaction.belongsTo(models.FeeHeading, { foreignKey: 'Fee_Head', as: 'FeeHeading' });
      Transaction.belongsTo(models.Transportation, { foreignKey: 'Route_Number', as: 'Transportation' });

      // User associations
      Transaction.belongsTo(models.User, { foreignKey: 'CreatedBy', as: 'Creator' });
      Transaction.belongsTo(models.User, { foreignKey: 'CancelledBy', as: 'Canceller' }); // NEW
    }
  }

  Transaction.init(
    {
      Serial: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      Slip_ID: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      AdmissionNumber: {
        type: DataTypes.STRING(6),
        allowNull: true,
      },
      Student_ID: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      Class_ID: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      Section_ID: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      DateOfTransaction: {
        type: DataTypes.STRING(28),
        allowNull: true,
      },
      Concession: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      Fee_Recieved: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      PaymentMode: {
        type: DataTypes.STRING(6),
        allowNull: true,
      },
      Transaction_ID: {
        type: DataTypes.STRING(31),
        allowNull: true,
      },
      Fee_Head: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      VanFee: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      Van_Fee_Concession: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      Route_Number: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      CreatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      CancelledBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      CancelledAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      Fine_Amount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: 'Transaction',
      tableName: 'Transactions',
      timestamps: true, // Adds createdAt and updatedAt
    }
  );

  return Transaction;
};
