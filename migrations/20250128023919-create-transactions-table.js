'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Transactions', {
      Serial: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      Slip_ID: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      AdmissionNumber: {
        type: Sequelize.STRING(6),
        allowNull: true,
        references: {
          model: 'students', // Name of the referenced table
          key: 'admission_number', // Column in the referenced table
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      Student_ID: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'students', // Name of the referenced table
          key: 'id', // Primary key in the referenced table
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      Class_ID: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'classes', // Name of the referenced table
          key: 'id', // Primary key in the referenced table
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      Section_ID: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Sections', // Name of the referenced table
          key: 'id', // Primary key in the referenced table
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      DateOfTransaction: {
        type: Sequelize.STRING(28),
        allowNull: true,
      },
      Concession: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      Fee_Recieved: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      PaymentMode: {
        type: Sequelize.STRING(6),
        allowNull: true,
      },
      Transaction_ID: {
        type: Sequelize.STRING(31),
        allowNull: true,
      },
      Fee_Head: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'FeeHeadings', // Name of the referenced table
          key: 'id', // Primary key in the referenced table
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      VanFee: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      Route_Number: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Transportations', // Name of the referenced table
          key: 'id', // Primary key in the referenced table
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Transactions');
  },
};
