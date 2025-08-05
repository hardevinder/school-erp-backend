'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Transactions', 'CreatedBy', {
      type: Sequelize.INTEGER,
      allowNull: true, // Adjust if you need to disallow null values
      references: {
        model: 'Users', // Make sure this matches the actual table name for your users
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', // Or choose the appropriate action (e.g., RESTRICT)
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Transactions', 'CreatedBy');
  }
};
