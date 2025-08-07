"use strict";
module.exports = (sequelize, DataTypes) => {
  const StudentCoScholasticEvaluation = sequelize.define("StudentCoScholasticEvaluation", {
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    co_scholastic_area_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    grade_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    remarks: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    term_id: {
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
    locked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  });

  StudentCoScholasticEvaluation.associate = function (models) {
    StudentCoScholasticEvaluation.belongsTo(models.Student, { foreignKey: "student_id" });
    StudentCoScholasticEvaluation.belongsTo(models.CoScholasticArea, { foreignKey: "co_scholastic_area_id" });
    StudentCoScholasticEvaluation.belongsTo(models.CoScholasticGrade, { foreignKey: "grade_id" }); // ✅ FIXED
    StudentCoScholasticEvaluation.belongsTo(models.Term, { foreignKey: "term_id" });
    StudentCoScholasticEvaluation.belongsTo(models.Class, { foreignKey: "class_id" });
    StudentCoScholasticEvaluation.belongsTo(models.Section, { foreignKey: "section_id" });
  };

  return StudentCoScholasticEvaluation;
};
