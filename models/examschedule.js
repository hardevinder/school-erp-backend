"use strict";

module.exports = (sequelize, DataTypes) => {
  const ExamSchedule = sequelize.define(
    "ExamSchedule",
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      exam_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
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
      term_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      exam_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      start_time: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      end_time: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "ExamSchedules",
      timestamps: true,
    }
  );

  ExamSchedule.associate = function (models) {
    ExamSchedule.belongsTo(models.Exam, {
      foreignKey: "exam_id",
      as: "exam",
    });
    ExamSchedule.belongsTo(models.Class, {
      foreignKey: "class_id",
      as: "class",
    });
    ExamSchedule.belongsTo(models.Section, {
      foreignKey: "section_id",
      as: "section",
    });
    ExamSchedule.belongsTo(models.Subject, {
      foreignKey: "subject_id",
      as: "subject",
    });
    ExamSchedule.belongsTo(models.Term, {
      foreignKey: "term_id",
      as: "term",
    });

    // Optional: For fetching exam schemes if needed
    ExamSchedule.hasMany(models.ExamScheme, {
      foreignKey: "class_id",
      sourceKey: "class_id",
      as: "exam_schemes",
      constraints: false,
    });
  };

  return ExamSchedule;
};
