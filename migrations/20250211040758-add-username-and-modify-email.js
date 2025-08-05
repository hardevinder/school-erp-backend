'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add the username column, allowing nulls temporarily
    await queryInterface.addColumn('Users', 'username', {
      type: Sequelize.STRING,
      allowNull: true,  // Allow null initially
      unique: true,
    });

    // 2. Update existing rows with a default username using their id (ensure uniqueness)
    // For MySQL, use CONCAT; for PostgreSQL, use "user_" || id
    await queryInterface.sequelize.query(`
      UPDATE Users SET username = CONCAT('user_', id) WHERE username IS NULL;
    `);

    // 3. Alter the username column to disallow null values now that it's populated
    await queryInterface.changeColumn('Users', 'username', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    });

    // 4. Modify the email column to allow null values
    await queryInterface.changeColumn('Users', 'email', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert the email column change: make email not nullable again
    await queryInterface.changeColumn('Users', 'email', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    });

    // Remove the username column from the Users table
    await queryInterface.removeColumn('Users', 'username');
  }
};
