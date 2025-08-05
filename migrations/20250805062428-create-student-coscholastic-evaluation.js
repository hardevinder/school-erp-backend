"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("StudentCoScholasticEvaluations", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      student_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "students", key: "id" },
        onDelete: "CASCADE",
      },
      co_scholastic_area_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "CoScholasticAreas", key: "id" },
        onDelete: "CASCADE",
      },
      grade_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "GradeSchemes", key: "id" },
        onDelete: "SET NULL",
      },
      remarks: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      term_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Terms", key: "id" },
        onDelete: "CASCADE",
      },
      class_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "classes", key: "id" },
        onDelete: "CASCADE",
      },
      section_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Sections", key: "id" },
        onDelete: "CASCADE",
      },
      locked: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("StudentCoScholasticEvaluations");
  },
};
