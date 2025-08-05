"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("AssessmentComponents", "abbreviation", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "N/A",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("AssessmentComponents", "abbreviation");
  },
};
