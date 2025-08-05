const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class Subject extends Model {}

  Subject.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize, // Pass the Sequelize instance from models/index.js
      modelName: "Subject",
      tableName: "subjects",
      timestamps: true,
    }
  );

  return Subject;
};
