"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("FeeStructures", "transportApplicable", {
      type: Sequelize.ENUM("Yes", "No"),
      allowNull: false,
      defaultValue: "No",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("FeeStructures", "transportApplicable");
  },
};
