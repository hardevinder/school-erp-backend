const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class User extends Model {
    isDisabled() {
      return this.status === "disabled";
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: { isEmail: true },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      google_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      admission_number: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      profilePhoto: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      fcmToken: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Firebase Cloud Messaging token for push notifications",
      },
      status: {
        type: DataTypes.ENUM("active", "disabled"),
        allowNull: false,
        defaultValue: "active",
      },
      disabledAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      disabledBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "User ID who disabled this account",
      },
      disableReason: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "Users",
      timestamps: true,
      paranoid: false,
      defaultScope: {
        // Default: no filters
      },
      scopes: {
        active: { where: { status: "active" } },
        disabled: { where: { status: "disabled" } },
      },
    }
  );

  // ✅ Move all associations inside here
  User.associate = (models) => {
    // Roles
    User.belongsToMany(models.Role, {
      through: "UserRoles",
      foreignKey: "userId",
      otherKey: "roleId",
      as: "roles",
    });

    // Self-reference: who disabled this user
    User.belongsTo(models.User, {
      as: "Disabler",
      foreignKey: "disabledBy",
    });

    // Link to Employee
    User.hasOne(models.Employee, {
      foreignKey: "user_id",
      as: "employee",
    });

    // Link to Student profile via username
    User.hasOne(models.Student, {
      foreignKey: "admission_number",
      sourceKey: "username",
      as: "studentProfile",
      constraints: false,
    });
  };

  return User;
};
