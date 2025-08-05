"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn("Users", "role", {
      type: Sequelize.ENUM("admin", "student"),
      allowNull: false,
      defaultValue: "student",
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn("users", "role");
  },
};
