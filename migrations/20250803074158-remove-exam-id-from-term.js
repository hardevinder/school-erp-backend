module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Terms", "exam_id");
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("exam_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
};
