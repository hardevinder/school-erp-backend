"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Step 1: Add column as nullable (to avoid constraint error if data exists)
    await queryInterface.addColumn("Terms", "exam_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // ✅ temporarily allow NULL for existing rows
    });

    // Step 2: Add foreign key constraint separately
    await queryInterface.addConstraint("Terms", {
      fields: ["exam_id"],
      type: "foreign key",
      name: "fk_terms_exam_id", // optional but helpful for down()
      references: {
        table: "Exams",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Step 1: Remove foreign key constraint
    await queryInterface.removeConstraint("Terms", "fk_terms_exam_id");

    // Step 2: Remove the column
    await queryInterface.removeColumn("Terms", "exam_id");
  },
};
