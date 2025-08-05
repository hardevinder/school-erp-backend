// models/employeeleaverequest.js
module.exports = (sequelize, DataTypes) => {
  const EmployeeLeaveRequest = sequelize.define(
    'EmployeeLeaveRequest',
    {
      employee_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      leave_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
      },
      is_without_pay: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      reviewed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'employee_leave_requests', // ✅ Explicit table name
      underscored: true, // ✅ snake_case columns (created_at, updated_at)
      timestamps: true,
    }
  );

  EmployeeLeaveRequest.associate = (models) => {
    EmployeeLeaveRequest.belongsTo(models.Employee, {
      foreignKey: 'employee_id',
      as: 'employee', // ✅ Alias required in controller includes
    });

    EmployeeLeaveRequest.belongsTo(models.LeaveType, {
      foreignKey: 'leave_type_id',
      as: 'leaveType', // ✅ Alias required in controller includes
    });

    EmployeeLeaveRequest.belongsTo(models.User, {
      foreignKey: 'reviewed_by',
      as: 'Reviewer',
    });
  };

  return EmployeeLeaveRequest;
};
