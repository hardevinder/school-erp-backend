"use strict";

module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.addColumn("employees", "employee_id", {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
    });

    // Optional: Backfill existing rows if any
    const [results] = await queryInterface.sequelize.query(`SELECT id FROM employees`);
    for (const row of results) {
      const empId = String(row.id).padStart(4, "0"); // E.g., 0001, 0002
      await queryInterface.sequelize.query(
        `UPDATE employees SET employee_id = :empId WHERE id = :id`,
        { replacements: { empId, id: row.id } }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("employees", "employee_id");
  },
};
