'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('students', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      father_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      mother_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      class_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'classes', // Reference the 'classes' table
          key: 'id',
        },
        onDelete: 'CASCADE', // Delete students if the class is deleted
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      father_phone: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      mother_phone: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      aadhaar_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      admission_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      status: {
        type: Sequelize.ENUM('enabled', 'disabled'),
        defaultValue: 'enabled',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('students');
  },
};
