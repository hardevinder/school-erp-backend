module.exports = (sequelize, DataTypes) => {
  const EmployeeLeaveBalance = sequelize.define('EmployeeLeaveBalance', {
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    leave_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      defaultValue: new Date().getFullYear(),
    },
    opening_balance: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    accrued: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    used: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    carry_forwarded: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    current_balance: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
  }, {
    tableName: 'employee_leave_balances',
  });

  EmployeeLeaveBalance.associate = (models) => {
    EmployeeLeaveBalance.belongsTo(models.Employee, {
      foreignKey: 'employee_id',
      as: 'employee', // ✅ important
    });

    EmployeeLeaveBalance.belongsTo(models.LeaveType, {
      foreignKey: 'leave_type_id',
      as: 'leaveType', // ✅ important
    });
  };

  return EmployeeLeaveBalance;
};
