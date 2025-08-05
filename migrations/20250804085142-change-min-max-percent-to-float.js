'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('GradeSchemes', 'min_percent', {
      type: Sequelize.FLOAT,
      allowNull: false,
    });

    await queryInterface.changeColumn('GradeSchemes', 'max_percent', {
      type: Sequelize.FLOAT,
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('GradeSchemes', 'min_percent', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    await queryInterface.changeColumn('GradeSchemes', 'max_percent', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
