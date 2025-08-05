module.exports = (sequelize, DataTypes) => {
  const Department = sequelize.define(
    "Department",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: {
            msg: "Department name cannot be empty",
          },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      deletedAt: {
        type: DataTypes.DATE,
      },
    },
    {
      tableName: "departments",
      timestamps: true, // createdAt + updatedAt
      paranoid: true,   // enables soft delete using deletedAt
    }
  );

  Department.associate = (models) => {
    Department.hasMany(models.Employee, {
      foreignKey: "department_id",
      as: "Employees",
    });
  };

  return Department;
};
