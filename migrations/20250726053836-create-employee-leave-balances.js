'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('employee_leave_balances', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'employees', // Must match table name
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      leave_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'LeaveTypes', // ✅ Updated to match actual table name
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      year: {
        type: Sequelize.INTEGER,
        defaultValue: new Date().getFullYear(),
      },
      opening_balance: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      accrued: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      used: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      carry_forwarded: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      current_balance: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('employee_leave_balances');
  },
};
