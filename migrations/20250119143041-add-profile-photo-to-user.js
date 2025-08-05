'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'profilePhoto', {
      type: Sequelize.STRING,
      allowNull: true, // Allow null because existing users won't have profile photos initially
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'profilePhoto');
  },
};
