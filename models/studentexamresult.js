"use strict";

module.exports = (sequelize, DataTypes) => {
  const StudentExamResult = sequelize.define(
    "StudentExamResult",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      student_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      exam_schedule_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      component_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      marks_obtained: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      grade: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      attendance: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "P",
        validate: {
          isIn: [["P", "A", "L", "ACT", "LA", "ML", "X"]],
        },
      },
    },
    {
      tableName: "StudentExamResults",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["student_id", "exam_schedule_id", "component_id"],
          name: "unique_student_schedule_component",
        },
      ],
    }
  );

  StudentExamResult.associate = (models) => {
    StudentExamResult.belongsTo(models.Student, {
      foreignKey: "student_id",
      as: "student",
    });

    StudentExamResult.belongsTo(models.ExamSchedule, {
      foreignKey: "exam_schedule_id",
      as: "schedule",
    });

    StudentExamResult.belongsTo(models.AssessmentComponent, {
      foreignKey: "component_id",
      as: "component",
    });
  };

  return StudentExamResult;
};
