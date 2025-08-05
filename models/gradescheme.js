"use strict";

module.exports = (sequelize, DataTypes) => {
  const GradeScheme = sequelize.define(
    "GradeScheme",
    {
      min_percent: {
        type: DataTypes.FLOAT, // changed from INTEGER to FLOAT
        allowNull: false,
      },
      max_percent: {
        type: DataTypes.FLOAT, // changed from INTEGER to FLOAT
        allowNull: false,
      },
      grade: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "GradeSchemes",
    }
  );

  GradeScheme.associate = function (models) {
    // No associations needed for now
  };

  return GradeScheme;
};
