// models/feeCategory.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FeeCategory = sequelize.define(
    'FeeCategory',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: 'fee_categories',
      timestamps: true, // if you want createdAt and updatedAt fields
    }
  );

  return FeeCategory;
};
