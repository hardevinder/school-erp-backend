"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove the sections column from the classes table
    await queryInterface.removeColumn("classes", "section");
  },

  down: async (queryInterface, Sequelize) => {
    // Add the sections column back to the classes table (if needed during rollback)
    await queryInterface.addColumn("classes", "sections", {
      type: Sequelize.STRING, // Adjust the data type if it was different
      allowNull: true, // Adjust if the column was NOT NULL before
    });
  },
};
