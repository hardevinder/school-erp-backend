"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Roles", "slug", {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE Roles
      SET slug = LOWER(REPLACE(name, ' ', '_'))
      WHERE slug IS NULL
    `);

    await queryInterface.changeColumn("Roles", "slug", {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("Roles", "slug");
  },
};
