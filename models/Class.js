const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Class = sequelize.define(
    "Class",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      class_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "classes", // Explicit table name
      timestamps: false,
    }
  );

  // Define associations
  Class.associate = (models) => {
    // Association with FeeStructure
    Class.hasMany(models.FeeStructure, {
      foreignKey: "class_id",
      as: "FeeStructures",
    });

    // Many-to-many with LessonPlan
    Class.belongsToMany(models.LessonPlan, {
      through: "LessonPlanClasses",
      foreignKey: "classId",
      otherKey: "lessonPlanId",
      as: "LessonPlans",
    });

    // ✅ Many-to-many with ReportCardFormat through ReportCardFormatClass
    Class.belongsToMany(models.ReportCardFormat, {
      through: models.ReportCardFormatClass,
      foreignKey: "class_id",
      otherKey: "report_card_format_id",
      as: "reportCardFormats",
    });
  };

  return Class;
};
