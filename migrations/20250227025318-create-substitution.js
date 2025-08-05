'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Substitutions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      periodId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      classId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      teacherId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      subjectId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      day: {
        type: Sequelize.STRING,
        allowNull: false
      },
      published: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Substitutions');
  }
};
