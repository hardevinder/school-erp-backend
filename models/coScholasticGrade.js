"use strict";
module.exports = (sequelize, DataTypes) => {
  const CoScholasticGrade = sequelize.define("CoScholasticGrade", {
    grade: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  });

  return CoScholasticGrade;
};
