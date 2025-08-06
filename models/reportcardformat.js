'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ReportCardFormat extends Model {
    static associate(models) {
      // ✅ Many-to-many association with Class through ReportCardFormatClass
      ReportCardFormat.belongsToMany(models.Class, {
        through: models.ReportCardFormatClass,
        foreignKey: "report_card_format_id",
        otherKey: "class_id",
        as: "classes",
      });
    }
  }

  ReportCardFormat.init(
    {
      title: DataTypes.STRING,
      header_html: DataTypes.TEXT,
      footer_html: DataTypes.TEXT,
      school_logo_url: DataTypes.STRING,
      board_logo_url: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "ReportCardFormat",
      tableName: "ReportCardFormats",
    }
  );

  return ReportCardFormat;
};
