const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const FeeStructure = sequelize.define(
    "FeeStructure",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      class_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "classes",
          key: "id",
        },
      },
      fee_heading_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "FeeHeadings",
          key: "id",
        },
      },
      feeDue: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      admissionType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      finePercentage: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      fineStartDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      fineType: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "percentage", // "percentage" or "slab"
      },
      fineAmountPerSlab: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      fineSlabDuration: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      concessionApplicable: {
        type: DataTypes.ENUM("Yes", "No"),
        allowNull: false,
        defaultValue: "No",
      },
      transportApplicable: {
        type: DataTypes.ENUM("Yes", "No"),
        allowNull: false,
        defaultValue: "No",
      },

      // ✅ Disable Support
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "FeeStructures",
      timestamps: true,
    }
  );

  FeeStructure.associate = (models) => {
    FeeStructure.belongsTo(models.Class, {
      foreignKey: "class_id",
      as: "Class",
    });

    FeeStructure.belongsTo(models.FeeHeading, {
      foreignKey: "fee_heading_id",
      as: "FeeHeading",
    });
  };

  return FeeStructure;
};
