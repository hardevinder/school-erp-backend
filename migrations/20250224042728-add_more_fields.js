'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('PeriodClassTeacherSubjects', 'subjectId_2', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('PeriodClassTeacherSubjects', 'teacherId_2', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('PeriodClassTeacherSubjects', 'subjectId_3', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('PeriodClassTeacherSubjects', 'teacherId_3', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('PeriodClassTeacherSubjects', 'subjectId_4', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('PeriodClassTeacherSubjects', 'teacherId_4', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('PeriodClassTeacherSubjects', 'subjectId_5', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('PeriodClassTeacherSubjects', 'teacherId_5', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('PeriodClassTeacherSubjects', 'subjectId_2');
    await queryInterface.removeColumn('PeriodClassTeacherSubjects', 'teacherId_2');
    await queryInterface.removeColumn('PeriodClassTeacherSubjects', 'subjectId_3');
    await queryInterface.removeColumn('PeriodClassTeacherSubjects', 'teacherId_3');
    await queryInterface.removeColumn('PeriodClassTeacherSubjects', 'subjectId_4');
    await queryInterface.removeColumn('PeriodClassTeacherSubjects', 'teacherId_4');
    await queryInterface.removeColumn('PeriodClassTeacherSubjects', 'subjectId_5');
    await queryInterface.removeColumn('PeriodClassTeacherSubjects', 'teacherId_5');
  }
};
