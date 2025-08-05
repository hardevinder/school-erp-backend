'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'fcmToken', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Firebase Cloud Messaging token for push notifications',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'fcmToken');
  }
};
