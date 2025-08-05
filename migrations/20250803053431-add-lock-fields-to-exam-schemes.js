"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await Promise.all([
      queryInterface.addColumn("ExamSchemes", "is_locked", {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      }),
      queryInterface.addColumn("ExamSchemes", "locked_by", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Users", // Make sure this matches your User table name
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      }),
      queryInterface.addColumn("ExamSchemes", "locked_at", {
        type: Sequelize.DATE,
        allowNull: true,
      }),
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await Promise.all([
      queryInterface.removeColumn("ExamSchemes", "is_locked"),
      queryInterface.removeColumn("ExamSchemes", "locked_by"),
      queryInterface.removeColumn("ExamSchemes", "locked_at"),
    ]);
  },
};
