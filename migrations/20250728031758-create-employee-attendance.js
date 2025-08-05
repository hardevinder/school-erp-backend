'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('employee_attendances', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'employees',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(
          'present',
          'absent',
          'first_half_day_leave',
          'second_half_day_leave',
          'short_leave',
          'full_day_leave',
          'leave',
          'half_day_without_pay'
        ),
        allowNull: false,
      },
      remarks: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addConstraint('employee_attendances', {
      fields: ['employee_id', 'date'],
      type: 'unique',
      name: 'unique_employee_date_attendance'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('employee_attendances');
  }
};
