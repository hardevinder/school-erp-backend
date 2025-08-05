'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('FeeStructures', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      dueMonth: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      class: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      feeDue: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      admissionType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('FeeStructures');
  },
};
