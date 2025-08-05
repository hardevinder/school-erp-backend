// migrations/xxxx-add-rollnumber-visible-to-students.js
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("students", "roll_number", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("students", "visible", {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("students", "roll_number");
    await queryInterface.removeColumn("students", "visible");
  },
};
