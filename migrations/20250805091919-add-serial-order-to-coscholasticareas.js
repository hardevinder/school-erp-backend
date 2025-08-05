module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("CoScholasticAreas", "serial_order", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("CoScholasticAreas", "serial_order");
  },
};
