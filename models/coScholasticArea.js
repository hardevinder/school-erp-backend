"use strict";
module.exports = (sequelize, DataTypes) => {
  const CoScholasticArea = sequelize.define("CoScholasticArea", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: DataTypes.STRING,
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  });

  return CoScholasticArea;
};
