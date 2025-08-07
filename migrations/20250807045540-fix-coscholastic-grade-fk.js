module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ✅ Skip removal (already done manually)

    // ✅ Add correct foreign key to CoScholasticGrades
    await queryInterface.addConstraint("StudentCoScholasticEvaluations", {
      fields: ["grade_id"],
      type: "foreign key",
      name: "fk_coscholastic_grade_id",
      references: {
        table: "CoScholasticGrades",
        field: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint("StudentCoScholasticEvaluations", "fk_coscholastic_grade_id");
  },
};
