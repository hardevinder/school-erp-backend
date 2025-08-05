"use strict";

module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("employees", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      gender: {
        type: DataTypes.ENUM("Male", "Female", "Other"),
        allowNull: false,
      },
      dob: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      aadhaar_number: {
        type: DataTypes.STRING(12),
        allowNull: false,
        unique: true,
      },
      department_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "departments",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      designation: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      joining_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("enabled", "disabled"),
        allowNull: false,
        defaultValue: "enabled",
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex("employees", ["aadhaar_number"], {
      unique: true,
      name: "unique_aadhaar_employee",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("employees");
  },
};
