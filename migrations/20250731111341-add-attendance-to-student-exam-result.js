"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("StudentExamResults", "attendance", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "P",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("StudentExamResults", "attendance");
  },
};
