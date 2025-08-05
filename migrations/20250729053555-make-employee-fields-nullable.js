"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.changeColumn("employees", "aadhaar_number", {
        type: Sequelize.STRING(12),
        allowNull: true,
      }),
      queryInterface.changeColumn("employees", "pan_number", {
        type: Sequelize.STRING(10),
        allowNull: true,
      }),
      queryInterface.changeColumn("employees", "emergency_contact", {
        type: Sequelize.STRING(10),
        allowNull: true,
      }),
      queryInterface.changeColumn("employees", "bank_account_number", {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn("employees", "ifsc_code", {
        type: Sequelize.STRING(11),
        allowNull: true,
      }),
    ]);
  },

  async down(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.changeColumn("employees", "aadhaar_number", {
        type: Sequelize.STRING(12),
        allowNull: false,
      }),
      queryInterface.changeColumn("employees", "pan_number", {
        type: Sequelize.STRING(10),
        allowNull: false,
      }),
      queryInterface.changeColumn("employees", "emergency_contact", {
        type: Sequelize.STRING(10),
        allowNull: false,
      }),
      queryInterface.changeColumn("employees", "bank_account_number", {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.changeColumn("employees", "ifsc_code", {
        type: Sequelize.STRING(11),
        allowNull: false,
      }),
    ]);
  },
};
