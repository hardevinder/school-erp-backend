'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('PeriodClassTeacherSubjects', 'combinationId', {
      type: Sequelize.STRING,
      allowNull: true,  // adjust if necessary
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('PeriodClassTeacherSubjects', 'combinationId');
  }
};
