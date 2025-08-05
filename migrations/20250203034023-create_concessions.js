module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("Concessions", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      concession_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      concession_percentage: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      concession_remarks: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("Concessions");
  },
};
