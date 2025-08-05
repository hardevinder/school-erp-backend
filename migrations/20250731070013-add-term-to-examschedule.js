module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Step 1: Add term_id (nullable temporarily)
    await queryInterface.addColumn("ExamSchedules", "term_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // Step 2 (Optional): Set default term_id for existing rows
    // Uncomment this if you know the correct term_id to apply globally (e.g., 1)
    // await queryInterface.sequelize.query(`UPDATE ExamSchedules SET term_id = 1`);

    // Step 3: Now add the foreign key constraint
    await queryInterface.changeColumn("ExamSchedules", "term_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Terms",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("ExamSchedules", "term_id");
  },
};
