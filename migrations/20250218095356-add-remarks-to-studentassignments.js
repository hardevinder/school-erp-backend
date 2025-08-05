'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('StudentAssignments', 'remarks', {
      type: Sequelize.STRING, // Use Sequelize.TEXT if you expect long remarks
      allowNull: true,
      defaultValue: null
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('StudentAssignments', 'remarks');
  }
};
