"use strict";
module.exports = (sequelize, DataTypes) => {
  const Term = sequelize.define(
    "Term",
    {
      academic_year_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      // exam_id: {
      //   type: DataTypes.INTEGER,
      //   allowNull: false,
      // },
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
      tableName: "Terms",
    }
  );

  Term.associate = function (models) {
    Term.belongsTo(models.AcademicYear, {
      foreignKey: "academic_year_id",
      as: "academicYear",
    });

    // Term.belongsTo(models.Exam, {
    //   foreignKey: "exam_id",
    //   as: "exam",
    // });
  };

  return Term;
};
