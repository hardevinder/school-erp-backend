'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('LeaveTypes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      accrual_frequency: {
        type: Sequelize.ENUM("monthly", "yearly", "per_days_worked"),
        allowNull: false,
        defaultValue: "monthly",
      },
      accrual_amount: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 1,
      },
      days_interval: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      max_per_year: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      carry_forward: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('LeaveTypes');
  },
};
