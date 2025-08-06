module.exports = (sequelize, DataTypes) => {
  const ReportCardFormatClass = sequelize.define(
    "ReportCardFormatClass",
    {
      report_card_format_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      class_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "ReportCardFormatClasses", // Explicit table name
      timestamps: false, // Disable timestamps for pivot table (optional)
    }
  );

  // ✅ Associations
  ReportCardFormatClass.associate = (models) => {
    ReportCardFormatClass.belongsTo(models.ReportCardFormat, {
      foreignKey: "report_card_format_id",
      as: "format",
    });

    ReportCardFormatClass.belongsTo(models.Class, {
      foreignKey: "class_id",
      as: "class",
    });
  };

  return ReportCardFormatClass;
};
