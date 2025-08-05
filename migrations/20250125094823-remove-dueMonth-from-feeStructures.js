"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable("FeeStructures");

    // Check if the 'dueMonth' column exists before trying to remove it
    if (tableDescription.dueMonth) {
      await queryInterface.removeColumn("FeeStructures", "dueMonth");
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable("FeeStructures");

    // Check if the 'dueMonth' column does not exist before adding it back
    if (!tableDescription.dueMonth) {
      await queryInterface.addColumn("FeeStructures", "dueMonth", {
        type: Sequelize.STRING,
        allowNull: false,
      });
    }
  },
};
