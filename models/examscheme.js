"use strict";

module.exports = (sequelize, DataTypes) => {
  const ExamScheme = sequelize.define(
    "ExamScheme",
    {
      class_id: {
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
      component_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      weightage_percent: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      serial_order: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
      tableName: "ExamSchemes",
      timestamps: false,
    }
  );

  ExamScheme.associate = function (models) {
    ExamScheme.belongsTo(models.Class, {
      foreignKey: "class_id",
      as: "class",
    });

    ExamScheme.belongsTo(models.Subject, {
      foreignKey: "subject_id",
      as: "subject",
    });

    ExamScheme.belongsTo(models.Term, {
      foreignKey: "term_id",
      as: "term",
    });

    ExamScheme.belongsTo(models.AssessmentComponent, {
      foreignKey: "component_id",
      as: "component",
    });

    // Optional association for locking user (if User model exists)
    ExamScheme.belongsTo(models.User, {
      foreignKey: "locked_by",
      as: "lockedByUser",
    });
  };

  return ExamScheme;
};
