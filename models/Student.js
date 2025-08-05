// models/student.js

module.exports = (sequelize, DataTypes) => {
  const Student = sequelize.define(
    "Student",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: "Name cannot be empty" } },
      },
      father_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: "Father's name cannot be empty" } },
      },
      mother_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: "Mother's name cannot be empty" } },
      },
      class_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "classes", key: "id" },
      },
      section_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "sections", key: "id" },
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      father_phone: {
        type: DataTypes.STRING(10),
        allowNull: false,
        validate: {
          isNumeric: { msg: "Father's phone must be numeric" },
          len: { args: [10, 10], msg: "Father's phone must be exactly 10 digits" },
        },
      },
      mother_phone: {
        type: DataTypes.STRING(10),
        allowNull: false,
        validate: {
          isNumeric: { msg: "Mother's phone must be numeric" },
          len: { args: [10, 10], msg: "Mother's phone must be exactly 10 digits" },
        },
      },
      aadhaar_number: {
        type: DataTypes.STRING(12),
        allowNull: false,
        unique: true,
        validate: {
          isNumeric: { msg: "Aadhaar number must be numeric" },
          len: { args: [12, 12], msg: "Aadhaar number must be exactly 12 digits" },
        },
      },
      admission_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { notEmpty: { msg: "Admission number cannot be empty" } },
      },
      status: {
        type: DataTypes.ENUM("enabled", "disabled"),
        allowNull: false,
        defaultValue: "enabled",
      },
      concession_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Concessions", key: "id" },
      },
      admission_type: {
        type: DataTypes.ENUM("New", "Old"),
        allowNull: false,
        defaultValue: "New",
      },
      roll_number: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      visible: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "students",
      timestamps: true,
      indexes: [{ unique: true, fields: ["admission_number"] }],
    }
  );

  Student.associate = (models) => {
    // Link to Class and Section
    Student.belongsTo(models.Class, {
      foreignKey: "class_id",
      as: "Class",
    });
    Student.belongsTo(models.Section, {
      foreignKey: "section_id",
      as: "Section",
    });

    // Link to Concession and Transactions
    Student.belongsTo(models.Concession, {
      foreignKey: "concession_id",
      as: "Concession",
    });
    Student.hasMany(models.Transaction, {
      foreignKey: "student_id",
      as: "Transactions",
    });

    // 🔗 Link Student → User by matching admission_number → username
    Student.belongsTo(models.User, {
      foreignKey: "admission_number",
      targetKey: "username",
      as: "userAccount",
      constraints: false,
    });

     // ✅ Add this association:
      Student.hasMany(models.StudentExamResult, {
        foreignKey: "student_id",
        as: "results", // make sure this matches your controller include
      });
  };

  return Student;
};
