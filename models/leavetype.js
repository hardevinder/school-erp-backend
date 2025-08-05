module.exports = (sequelize, DataTypes) => {
  const LeaveType = sequelize.define("LeaveType", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    abbreviation: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Short form like CL, SL, LWP, etc.",
    },
    accrual_frequency: {
      type: DataTypes.ENUM("monthly", "yearly", "per_days_worked"),
      allowNull: false,
      defaultValue: "monthly",
    },
    accrual_amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1,
    },
    days_interval: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    max_per_year: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    carry_forward: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: "LeaveTypes",
    timestamps: true,
  });

  // 👇 Add this
  LeaveType.associate = (models) => {
    LeaveType.hasMany(models.EmployeeLeaveBalance, {
      foreignKey: "leave_type_id",
      as: "leaveBalances",
    });
  };

  return LeaveType;
};
