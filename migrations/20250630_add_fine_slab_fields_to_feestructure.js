'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('FeeStructures', 'fineType', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'percentage', // 'slab' or 'percentage'
    });

    await queryInterface.addColumn('FeeStructures', 'fineAmountPerSlab', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    await queryInterface.addColumn('FeeStructures', 'fineSlabDuration', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('FeeStructures', 'fineType');
    await queryInterface.removeColumn('FeeStructures', 'fineAmountPerSlab');
    await queryInterface.removeColumn('FeeStructures', 'fineSlabDuration');
  },
};
