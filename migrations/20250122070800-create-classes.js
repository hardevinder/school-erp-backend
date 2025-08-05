module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("classes", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      class_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      section: {
        type: Sequelize.STRING,
        allowNull: false,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("classes");
  },
};
