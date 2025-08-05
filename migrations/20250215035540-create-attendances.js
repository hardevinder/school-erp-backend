'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Attendances', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      studentId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: 'students', // make sure your Students table is named correctly
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      date: {
        allowNull: false,
        type: Sequelize.DATEONLY
      },
      status: {
        allowNull: false,
        type: Sequelize.ENUM('present', 'absent', 'late'),
        defaultValue: 'present'
      },
      remarks: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdBy: {
        allowNull: false,
        type: Sequelize.INTEGER,
        comment: 'ID of the user who created this record'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Adding a unique index to prevent duplicate attendance records for the same student and date.
    await queryInterface.addIndex('Attendances', ['studentId', 'date'], {
      unique: true,
      name: 'attendances_student_date_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Attendances');
  }
};
