// migrations/YYYYMMDDHHMMSS-create-transportation.js
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Transportations", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      RouteName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      Villages: {
        type: Sequelize.STRING, // Use Sequelize.JSON if storing as an array.
        allowNull: false,
      },
      Cost: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Transportations");
  },
};
