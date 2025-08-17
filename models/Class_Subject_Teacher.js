// models/ClassSubjectTeacher.js
const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class ClassSubjectTeacher extends Model {
    static associate(models) {
      ClassSubjectTeacher.belongsTo(models.Class, {
        foreignKey: "class_id",
        as: "Class",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
      ClassSubjectTeacher.belongsTo(models.Section, {
        foreignKey: "section_id",
        as: "Section",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
      ClassSubjectTeacher.belongsTo(models.Subject, {
        foreignKey: "subject_id",
        as: "Subject",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
      // NOTE: teacher_id stores User.id (controller resolves Employee->User)
      ClassSubjectTeacher.belongsTo(models.User, {
        foreignKey: "teacher_id",
        as: "Teacher",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  ClassSubjectTeacher.init(
    {
      class_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      section_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      subject_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      // Stores User.id (not Employee.id)
      teacher_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "ClassSubjectTeacher",
      tableName: "Class_Subject_Teacher", // keep your existing table name
      timestamps: true,
      indexes: [
        // Fast lookups
        { fields: ["class_id"] },
        { fields: ["section_id"] },
        { fields: ["subject_id"] },
        { fields: ["teacher_id"] },
        // Enforce one (class,section,subject)
        {
          unique: true,
          name: "uniq_class_section_subject",
          fields: ["class_id", "section_id", "subject_id"],
        },
      ],
    }
  );

  return ClassSubjectTeacher;
};
