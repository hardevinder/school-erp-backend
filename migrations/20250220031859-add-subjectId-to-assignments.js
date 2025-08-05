'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Assignments', 'subjectId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'subjects', // This should match the table name for Subject (as defined in its model)
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Assignments', 'subjectId');
  }
};
