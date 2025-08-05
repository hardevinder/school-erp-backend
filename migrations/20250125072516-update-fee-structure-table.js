"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable("FeeStructures");

    // Add 'class_id' column if it doesn't exist
    if (!tableDescription.class_id) {
      await queryInterface.addColumn("FeeStructures", "class_id", {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "classes", // Foreign key to Classes table
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      });
    }

    // Add 'fee_heading_id' column if it doesn't exist
    if (!tableDescription.fee_heading_id) {
      await queryInterface.addColumn("FeeStructures", "fee_heading_id", {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "FeeHeadings", // Foreign key to FeeHeadings table
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      });
    }

    // Remove 'class' column if it exists
    if (tableDescription.class) {
      await queryInterface.removeColumn("FeeStructures", "class");
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable("FeeStructures");

    // Remove 'class_id' column if it exists
    if (tableDescription.class_id) {
      await queryInterface.removeColumn("FeeStructures", "class_id");
    }

    // Remove 'fee_heading_id' column if it exists
    if (tableDescription.fee_heading_id) {
      await queryInterface.removeColumn("FeeStructures", "fee_heading_id");
    }

    // Add back 'class' column if it was removed
    if (!tableDescription.class) {
      await queryInterface.addColumn("FeeStructures", "class", {
        type: Sequelize.STRING,
        allowNull: false,
      });
    }
  },
};
