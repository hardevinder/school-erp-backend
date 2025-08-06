"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("ReportCardFormatClasses", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      report_card_format_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "ReportCardFormats", // ✅ this must match exactly
          key: "id",
        },
        onDelete: "CASCADE",
      },
      class_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "classes",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("ReportCardFormatClasses");
  },
};
