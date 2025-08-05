"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ClassCoScholasticAreas", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      class_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "classes", key: "id" }, // ✅ fixed
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      area_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "CoScholasticAreas", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      term_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Terms", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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
    await queryInterface.dropTable("ClassCoScholasticAreas");
  },
};
