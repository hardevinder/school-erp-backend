"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "status", {
      type: Sequelize.ENUM("active", "disabled"),
      allowNull: false,
      defaultValue: "active",
    });

    await queryInterface.addColumn("Users", "disabledAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("Users", "disabledBy", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "Users", key: "id" }, // optional FK
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("Users", "disableReason", {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove columns first
    await queryInterface.removeColumn("Users", "disableReason");
    await queryInterface.removeColumn("Users", "disabledBy");
    await queryInterface.removeColumn("Users", "disabledAt");
    await queryInterface.removeColumn("Users", "status");

    // Postgres only: drop enum type
    if (queryInterface.sequelize.getDialect() === "postgres") {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Users_status";');
    }
  },
};
