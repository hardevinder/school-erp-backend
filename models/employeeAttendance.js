// models/employeeattendance.js
module.exports = (sequelize, DataTypes) => {
  const EmployeeAttendance = sequelize.define(
    "EmployeeAttendance",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      employee_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "employees", // table name
          key: "id",
        },
      },

      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM(
          "present",
          "absent",
          "first_half_day_leave",
          "second_half_day_leave",
          "short_leave",
          "full_day_leave",
          "leave",
          "half_day_without_pay"
        ),
        allowNull: false,
      },

      remarks: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      // NEW: optional punch times (use TIME; switch to DATETIME if you have overnight shifts)
      in_time: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      out_time: {
        type: DataTypes.TIME,
        allowNull: true,
      },
    },
    {
      tableName: "employee_attendances",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["employee_id", "date"], // one attendance per day per employee
        },
      ],
    }
  );

  // Association: EmployeeAttendance -> Employee
  EmployeeAttendance.associate = (models) => {
    EmployeeAttendance.belongsTo(models.Employee, {
      foreignKey: "employee_id",
      as: "employee",
    });
  };

  return EmployeeAttendance;
};
