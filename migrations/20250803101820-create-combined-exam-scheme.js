"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("CombinedExamSchemes", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      class_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "classes", // 👈 lowercase
          key: "id",
        },
        onDelete: "CASCADE",
      },
      subject_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "subjects", // 👈 lowercase
          key: "id",
        },
        onDelete: "CASCADE",
      },
      exam_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Exams", // 👈 PascalCase, matches model definition
          key: "id",
        },
        onDelete: "CASCADE",
      },
      weightage_percent: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("CombinedExamSchemes");
  },
};
