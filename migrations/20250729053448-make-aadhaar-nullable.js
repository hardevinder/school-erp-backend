'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('employees', 'aadhaar_number', {
      type: Sequelize.STRING(12),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('employees', 'aadhaar_number', {
      type: Sequelize.STRING(12),
      allowNull: false,
    });
  },
};
