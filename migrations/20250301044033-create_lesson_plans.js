"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("LessonPlans", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      teacherId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users", // References Users table
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      classIds: {
        type: Sequelize.JSON, // Storing multiple class IDs as an array
        allowNull: false,
      },
      subjectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Subjects", // References Subjects table
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      weekNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "Week number of the academic year",
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      topic: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Main topic to be covered in the lesson plan",
      },
      objectives: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Learning objectives for the week",
      },
      activities: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Teaching strategies or activities planned",
      },
      resources: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Reference materials, books, or online resources",
      },
      homework: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Homework or assignments for the week",
      },
      assessmentMethods: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "How the teacher will assess student understanding",
      },
      status: {
        type: Sequelize.ENUM("Pending", "In Progress", "Completed"),
        defaultValue: "Pending",
        allowNull: false,
        comment: "Status of the lesson plan",
      },
      remarks: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Additional notes or feedback on the lesson",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("LessonPlans");
  },
};
