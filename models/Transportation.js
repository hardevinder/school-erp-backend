module.exports = (sequelize, DataTypes) => {
  const Transportation = sequelize.define(
    "Transportation",
    {
      RouteName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      Villages: {
        type: DataTypes.STRING, // Use JSON if needed
        allowNull: false,
      },
      Cost: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      finePercentage: {
        type: DataTypes.FLOAT,
        allowNull: true, // Can be null if no fine is applied
        defaultValue: 0, // Default to no fine
      },
      fineStartDate: {
        type: DataTypes.DATE,
        allowNull: true, // Can be null if no fine start date is set
      },
    },
    {
      tableName: "Transportations", // Explicitly specify the correct table name
    }
  );

  return Transportation;
};
  