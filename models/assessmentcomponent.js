"use strict";
module.exports = (sequelize, DataTypes) => {
  const AssessmentComponent = sequelize.define(
    "AssessmentComponent",
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      abbreviation: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      max_marks: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      is_internal: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_practical: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "AssessmentComponents",
    }
  );

  AssessmentComponent.associate = function (models) {
    // Will be associated with ExamScheme later
  };

  return AssessmentComponent;
};
