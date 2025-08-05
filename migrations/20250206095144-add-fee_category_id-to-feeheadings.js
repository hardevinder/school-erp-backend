'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('FeeHeadings', 'fee_category_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1, // Set default value to 1
      references: {
        model: 'fee_categories', // Ensure this matches the FeeCategory table name
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('FeeHeadings', 'fee_category_id');
  }
};
