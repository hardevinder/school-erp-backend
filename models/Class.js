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
    // Existing association with FeeStructure
    Class.hasMany(models.FeeStructure, {
      foreignKey: "class_id",
      as: "FeeStructures",
    });
    // New association with LessonPlan (many-to-many)
    Class.belongsToMany(models.LessonPlan, {
      through: "LessonPlanClasses",
      foreignKey: "classId",
      otherKey: "lessonPlanId",
      as: "LessonPlans",
    });
  };

  return Class;
};
