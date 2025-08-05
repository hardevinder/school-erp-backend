'use strict';
module.exports = (sequelize, DataTypes) => {
  const UserRoles = sequelize.define('UserRoles', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  });

  return UserRoles;
};
