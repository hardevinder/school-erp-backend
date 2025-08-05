module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("students", "concession_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // Can be NULL if no concession applied
      references: {
        model: "Concessions", // This must match the table name of the `Concession` model
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("students", "admission_type", {
      type: Sequelize.ENUM("New", "Old"),
      allowNull: false,
      defaultValue: "New", // Default is "New"
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("students", "concession_id");
    await queryInterface.removeColumn("students", "admission_type");
  },
};
