"use strict";

module.exports = (sequelize, DataTypes) => {
  const CombinedExamScheme = sequelize.define(
    "CombinedExamScheme",
    {
      class_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      subject_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      exam_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      component_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      weightage_percent: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
    },
    {
      tableName: "CombinedExamSchemes",
      timestamps: false,
    }
  );

  CombinedExamScheme.associate = function (models) {
    CombinedExamScheme.belongsTo(models.Class, {
      foreignKey: "class_id",
      as: "class",
    });

    CombinedExamScheme.belongsTo(models.Subject, {
      foreignKey: "subject_id",
      as: "subject",
    });

    CombinedExamScheme.belongsTo(models.Exam, {
      foreignKey: "exam_id",
      as: "exam",
    });

    // ✅ Added association to AssessmentComponent
    CombinedExamScheme.belongsTo(models.AssessmentComponent, {
      foreignKey: "component_id",
      as: "component",
    });
  };

  return CombinedExamScheme;
};
