module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Transportations", "finePercentage", {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: 0,
    });
    await queryInterface.addColumn("Transportations", "fineStartDate", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Transportations", "finePercentage");
    await queryInterface.removeColumn("Transportations", "fineStartDate");
  },
};
