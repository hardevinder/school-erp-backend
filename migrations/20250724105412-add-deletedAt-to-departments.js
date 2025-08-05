module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("departments", "deletedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("departments", "deletedAt");
  },
};
