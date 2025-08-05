const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class ClassSubjectTeacher extends Model {
    static associate(models) {
      ClassSubjectTeacher.belongsTo(models.Class, {
        foreignKey: "class_id",
        as: "Class",
      });
      ClassSubjectTeacher.belongsTo(models.Section, {
        foreignKey: "section_id",
        as: "Section",
      });
      ClassSubjectTeacher.belongsTo(models.Subject, {
        foreignKey: "subject_id",
        as: "Subject",
      });
      ClassSubjectTeacher.belongsTo(models.User, {
        foreignKey: "teacher_id",
        as: "Teacher",
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
      teacher_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "ClassSubjectTeacher",
      tableName: "Class_Subject_Teacher",
      timestamps: true,
    }
  );

  return ClassSubjectTeacher;
};
