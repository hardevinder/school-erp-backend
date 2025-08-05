// models/role.js
module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define(
    "Role",
    {
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
      slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    },
    {
      tableName: "Roles",   // 👈 match the real table name exactly
      timestamps: false,    // or true if you use createdAt/updatedAt
      // freezeTableName: true // optional
    }
  );

  Role.associate = (models) => {
    Role.belongsToMany(models.User, {
      through: "UserRoles",
      foreignKey: "roleId",
      otherKey: "userId",
      as: "users",
    });
  };

  return Role;
};
