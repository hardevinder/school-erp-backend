"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("FeeStructures", "finePercentage", {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: 0,
    });

    await queryInterface.addColumn("FeeStructures", "fineStartDate", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("FeeStructures", "finePercentage");
    await queryInterface.removeColumn("FeeStructures", "fineStartDate");
  },
};
