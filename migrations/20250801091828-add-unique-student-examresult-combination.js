"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addConstraint("StudentExamResults", {
      fields: ["student_id", "exam_schedule_id", "component_id"],
      type: "unique",
      name: "unique_student_schedule_component", // 👈 match model index name
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint(
      "StudentExamResults",
      "unique_student_schedule_component"
    );
  },
};
