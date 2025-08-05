module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Incharges', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      classId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'classes',  // Assuming you have a Classes table
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sectionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Sections', // Assuming you have a Sections table
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      teacherId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users', // Assuming Teachers are stored in the Users table
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Incharges');
  }
};
