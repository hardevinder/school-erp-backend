'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Update 'status' column to ENUM (optional: if you're using ENUM)
    await queryInterface.changeColumn('Transactions', 'status', {
      type: Sequelize.ENUM('pending', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    });

    // Add 'CancelledBy'
    await queryInterface.addColumn('Transactions', 'CancelledBy', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // Add 'CancelledAt'
    await queryInterface.addColumn('Transactions', 'CancelledAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove cancel fields
    await queryInterface.removeColumn('Transactions', 'CancelledAt');
    await queryInterface.removeColumn('Transactions', 'CancelledBy');

    // Revert status to string (if ENUM was used)
    await queryInterface.changeColumn('Transactions', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'pending',
    });

    // Drop ENUM type in Postgres (optional and safe for MySQL too)
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Transactions_status";');
    }
  }
};
