"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Exams", "is_locked", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });

    await queryInterface.addColumn("Exams", "locked_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "Users", // Assuming your user table is named 'Users'
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("Exams", "locked_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Exams", "is_locked");
    await queryInterface.removeColumn("Exams", "locked_by");
    await queryInterface.removeColumn("Exams", "locked_at");
  },
};
