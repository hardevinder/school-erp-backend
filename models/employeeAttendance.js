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
          model: "employees", // Sequelize will match table name 'employees'
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
    },
    {
      tableName: "employee_attendances",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["employee_id", "date"], // Ensures one attendance per day
        },
      ],
    }
  );

  // ✅ Define association for Employee -> EmployeeAttendance
  EmployeeAttendance.associate = (models) => {
    EmployeeAttendance.belongsTo(models.Employee, {
      foreignKey: "employee_id",
      as: "employee", // MUST match the `as` used in controller includes
    });
  };

  return EmployeeAttendance;
};
