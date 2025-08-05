'use strict';
module.exports = (sequelize, DataTypes) => {
  const School = sequelize.define('School', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    logo: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {});
  
  return School;
};
