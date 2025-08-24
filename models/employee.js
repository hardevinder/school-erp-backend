// models/Employee.js
"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Employee extends Model {
    // Virtual fallback: always give something printable
    get display_name() {
      const selfName = this.getDataValue("name");
      // If include loaded, prefer userAccount.name when self name is empty
      const ua = this.get("userAccount");
      const uaName = ua && (ua.name || (ua.get ? ua.get("name") : undefined));
      return (selfName && selfName.trim()) || uaName || "";
    }
  }

  Employee.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      employee_id: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true,
      },

      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: "Name cannot be empty" } },
      },

      phone: {
        type: DataTypes.STRING(10),
        allowNull: false,
        validate: {
          notEmpty: { msg: "Phone is required" },
          isNumeric: { msg: "Phone must be numeric" },
          len: { args: [10, 10], msg: "Phone must be exactly 10 digits" },
        },
      },

      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Email is required" },
          isEmail: { msg: "Invalid email address" },
        },
      },

      // Optional fields
      gender: { type: DataTypes.ENUM("Male", "Female", "Other"), allowNull: true },
      dob: { type: DataTypes.DATEONLY, allowNull: true },

      aadhaar_number: {
        type: DataTypes.STRING(12),
        allowNull: true,
        unique: true,
        validate: {
          isNumeric: { msg: "Aadhaar must be numeric" },
          len: { args: [12, 12], msg: "Aadhaar must be 12 digits" },
        },
      },

      pan_number: {
        type: DataTypes.STRING(10),
        allowNull: true,
        validate: { is: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/ },
      },

      educational_qualification: { type: DataTypes.TEXT, allowNull: true },
      professional_qualification: { type: DataTypes.TEXT, allowNull: true },
      experience_years: { type: DataTypes.INTEGER, allowNull: true },

      blood_group: {
        type: DataTypes.ENUM("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"),
        allowNull: true,
      },

      emergency_contact: {
        type: DataTypes.STRING(10),
        allowNull: true,
        validate: { isNumeric: true, len: [10, 10] },
      },

      marital_status: {
        type: DataTypes.ENUM("Single", "Married", "Other"),
        allowNull: true,
      },

      photo_url: { type: DataTypes.STRING, allowNull: true },

      bank_account_number: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isNumeric: true,
          len: { args: [9, 20], msg: "Bank account number should be 9–20 digits" },
        },
      },

      ifsc_code: {
        type: DataTypes.STRING(11),
        allowNull: true,
        validate: { is: /^[A-Z]{4}0[A-Z0-9]{6}$/ },
      },

      bank_name: { type: DataTypes.STRING, allowNull: true },
      account_holder_name: { type: DataTypes.STRING, allowNull: true },

      department_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "departments", key: "id" },
      },

      designation: { type: DataTypes.STRING, allowNull: true },
      joining_date: { type: DataTypes.DATEONLY, allowNull: true },
      address: { type: DataTypes.TEXT, allowNull: true },

      status: {
        type: DataTypes.ENUM("enabled", "disabled"),
        allowNull: false,
        defaultValue: "enabled",
      },

      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        // If you want 1:1 User↔Employee, uncomment the next line
        // unique: true,
      },

      // ✅ Expose display_name to JSON without storing it in DB
      display_name: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.display_name; // uses the getter above
        },
        set() {
          throw new Error("display_name is a virtual field and cannot be set");
        },
      },
    },
    {
      sequelize,
      modelName: "Employee",
      tableName: "employees",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["employee_id"] },
        { unique: true, fields: ["aadhaar_number"] }, // allows multiple NULLs in most DBs
        // If you enforce one employee per user, add:
        // { unique: true, fields: ["user_id"] },
      ],
      hooks: {
        beforeValidate(emp) {
          if (typeof emp.name === "string") emp.name = emp.name.trim();
          if (typeof emp.email === "string") emp.email = emp.email.trim().toLowerCase();
          if (typeof emp.phone === "string") emp.phone = emp.phone.trim();
        },
      },
    }
  );

  Employee.associate = (models) => {
    Employee.belongsTo(models.Department, {
      foreignKey: "department_id",
      as: "department",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    // MUST stay 'userAccount' to match controller includes
    Employee.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "userAccount",
      onUpdate: "CASCADE",
      onDelete: "SET NULL", // or 'RESTRICT' if you never delete Users
    });

    Employee.hasMany(models.EmployeeAttendance, {
      foreignKey: "employee_id",
      as: "attendances",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  };

  return Employee;
};
