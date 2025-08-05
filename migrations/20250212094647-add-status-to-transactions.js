'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Transactions', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Payment status of the transaction (e.g., pending, paid)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Transactions', 'status');
  }
};
