'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('LessonPlans', 'publish', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indicates whether the lesson plan is published'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('LessonPlans', 'publish');
  }
};
