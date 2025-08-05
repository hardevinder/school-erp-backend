"use strict";
module.exports = (sequelize, DataTypes) => {
  const AcademicYear = sequelize.define(
    "AcademicYear",
    {
      name: {
        type: DataTypes.STRING,
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
    },
    {
      tableName: "AcademicYears",
    }
  );

  AcademicYear.associate = function (models) {
    // Will be linked with Term table later
    AcademicYear.hasMany(models.Term, {
      foreignKey: "academic_year_id",
      as: "terms",
    });
  };

  return AcademicYear;
};
