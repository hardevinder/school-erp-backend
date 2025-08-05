module.exports = (sequelize, DataTypes) => {
  const FeeHeading = sequelize.define(
    "FeeHeading",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      fee_heading: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      fee_category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "FeeCategories", // Assumes the table for FeeCategory is named FeeCategories
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
    },
    {
      tableName: "FeeHeadings",
      timestamps: true,
      hooks: {
        // Emit an event when a FeeHeading is created
        afterCreate: (feeHeading, options) => {
          if (global.io) {
            global.io.emit("feeHeadingCreated", feeHeading);
          }
        },
        // Emit an event when a FeeHeading is updated
        afterUpdate: (feeHeading, options) => {
          if (global.io) {
            global.io.emit("feeHeadingUpdated", feeHeading);
          }
        },
        // Emit an event when a FeeHeading is deleted
        afterDestroy: (feeHeading, options) => {
          if (global.io) {
            global.io.emit("feeHeadingDeleted", feeHeading);
          }
        },
      },
    }
  );

  // Define associations
  FeeHeading.associate = (models) => {
    FeeHeading.belongsTo(models.FeeCategory, {
      foreignKey: "fee_category_id",
      as: "FeeCategory",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    FeeHeading.hasMany(models.FeeStructure, {
      foreignKey: "fee_heading_id",
      as: "FeeStructures",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return FeeHeading;
};
