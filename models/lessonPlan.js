const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class LessonPlan extends Model {
    static associate(models) {
      // Association with Teacher (User)
      LessonPlan.belongsTo(models.User, { foreignKey: "teacherId", as: "Teacher" });
      
      // Association with Subject
      LessonPlan.belongsTo(models.Subject, { foreignKey: "subjectId", as: "Subject" });
      
      // Many-to-many association with Class via join table 'LessonPlanClasses'
      LessonPlan.belongsToMany(models.Class, {
        through: "LessonPlanClasses",
        foreignKey: "lessonPlanId",
        otherKey: "classId",
        as: "Classes",
      });
    }
  }

  LessonPlan.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      teacherId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      // Updated: Allow null and provide default empty array.
      classIds: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      subjectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      weekNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Week number of the academic year",
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      topic: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Main topic covered in the lesson plan",
      },
      objectives: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Learning objectives for the week",
      },
      activities: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Teaching strategies or activities planned",
      },
      resources: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Reference materials, books, or online resources",
      },
      homework: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Homework or assignments for the week",
      },
      assessmentMethods: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "How the teacher will assess student understanding",
      },
      status: {
        type: DataTypes.ENUM("Pending", "In Progress", "Completed"),
        defaultValue: "Pending",
        comment: "Status of the lesson plan",
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Additional notes or feedback on the lesson",
      },
      // New publish column
      publish: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Indicates whether the lesson plan is published",
      },
    },
    {
      sequelize,
      modelName: "LessonPlan",
      tableName: "LessonPlans",
      timestamps: true,
    }
  );

  return LessonPlan;
};
