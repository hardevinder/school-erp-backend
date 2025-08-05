module.exports = (sequelize, DataTypes) => {
  const Concession = sequelize.define(
    "Concession",
    {
      concession_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      concession_percentage: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      concession_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "Concessions", // ✅ Explicitly set table name to match DB
      timestamps: false,
    }
  );

  // ✅ Ensure Concession model is properly associated with Student
  Concession.associate = (models) => {
    Concession.hasMany(models.Student, {
      foreignKey: "concession_id",
      as: "Students",
    });
  };

  return Concession;
};
