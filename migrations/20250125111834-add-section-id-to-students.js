'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('students', 'section_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Set `true` if existing records may not have a section
      references: {
        model: 'Sections', // Name of the referenced table
        key: 'id',         // Column in the referenced table
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', // Set to `CASCADE` or `SET NULL` as per your requirement
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('students', 'section_id');
  },
};
