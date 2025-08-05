"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Section extends Model {
    static associate(models) {
      // Define associations here if needed
      // Example: Section.belongsTo(models.Class);
    }
  }
  Section.init(
    {
      section_name: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: {
            msg: "Section name cannot be empty",
          },
        },
      },
    },
    {
      sequelize,
      modelName: "Section",
      tableName: "Sections",
      timestamps: true,
    }
  );
  return Section;
};
