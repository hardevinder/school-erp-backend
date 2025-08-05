'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('PeriodClassTeacherSubjects', 'effectFrom', {
        type: Sequelize.DATE,
        allowNull: true,  // change to false if you require a value
      }),
      queryInterface.addColumn('PeriodClassTeacherSubjects', 'published', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      })
    ]);
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('PeriodClassTeacherSubjects', 'effectFrom'),
      queryInterface.removeColumn('PeriodClassTeacherSubjects', 'published')
    ]);
  }
};
