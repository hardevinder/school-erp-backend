"use strict";

module.exports = (sequelize, DataTypes) => {
  const Exam = sequelize.define(
    "Exam",
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      term_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      exam_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      is_locked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      locked_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      locked_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "Exams",
    }
  );

  Exam.associate = function (models) {
    Exam.belongsTo(models.Term, {
      foreignKey: "term_id",
      as: "term",
    });

    Exam.hasMany(models.ExamSchedule, {
      foreignKey: "exam_id",
      as: "schedules",
    });

    // Optional: track the user who locked the exam
    Exam.belongsTo(models.User, {
      foreignKey: "locked_by",
      as: "lockedBy",
    });
  };

  return Exam;
};
