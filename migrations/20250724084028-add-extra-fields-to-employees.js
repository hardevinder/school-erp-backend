"use strict";

module.exports = {
  async up(queryInterface, DataTypes) {
    await Promise.all([
      queryInterface.addColumn("employees", "pan_number", {
        type: DataTypes.STRING(10),
        allowNull: true,
      }),
      queryInterface.addColumn("employees", "educational_qualification", {
        type: DataTypes.TEXT,
        allowNull: true,
      }),
      queryInterface.addColumn("employees", "professional_qualification", {
        type: DataTypes.TEXT,
        allowNull: true,
      }),
      queryInterface.addColumn("employees", "experience_years", {
        type: DataTypes.INTEGER,
        allowNull: true,
      }),
      queryInterface.addColumn("employees", "blood_group", {
        type: DataTypes.ENUM("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"),
        allowNull: true,
      }),
      queryInterface.addColumn("employees", "emergency_contact", {
        type: DataTypes.STRING(10),
        allowNull: true,
      }),
      queryInterface.addColumn("employees", "marital_status", {
        type: DataTypes.ENUM("Single", "Married", "Other"),
        allowNull: true,
      }),
      queryInterface.addColumn("employees", "photo_url", {
        type: DataTypes.STRING,
        allowNull: true,
      }),
      queryInterface.addColumn("employees", "bank_account_number", {
        type: DataTypes.STRING,
        allowNull: false,
      }),
      queryInterface.addColumn("employees", "ifsc_code", {
        type: DataTypes.STRING(11),
        allowNull: false,
      }),
      queryInterface.addColumn("employees", "bank_name", {
        type: DataTypes.STRING,
        allowNull: false,
      }),
      queryInterface.addColumn("employees", "account_holder_name", {
        type: DataTypes.STRING,
        allowNull: true,
      }),
    ]);
  },

  async down(queryInterface) {
    await Promise.all([
      queryInterface.removeColumn("employees", "pan_number"),
      queryInterface.removeColumn("employees", "educational_qualification"),
      queryInterface.removeColumn("employees", "professional_qualification"),
      queryInterface.removeColumn("employees", "experience_years"),
      queryInterface.removeColumn("employees", "blood_group"),
      queryInterface.removeColumn("employees", "emergency_contact"),
      queryInterface.removeColumn("employees", "marital_status"),
      queryInterface.removeColumn("employees", "photo_url"),
      queryInterface.removeColumn("employees", "bank_account_number"),
      queryInterface.removeColumn("employees", "ifsc_code"),
      queryInterface.removeColumn("employees", "bank_name"),
      queryInterface.removeColumn("employees", "account_holder_name"),
    ]);
  },
};
