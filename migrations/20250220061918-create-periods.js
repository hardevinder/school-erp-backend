'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Periods', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      period_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      start_time: {
        type: Sequelize.STRING, // Changed from TIME to STRING
        allowNull: false,
      },
      end_time: {
        type: Sequelize.STRING, // Changed from TIME to STRING
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Periods');
  }
};
