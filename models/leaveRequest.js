
module.exports = (sequelize, DataTypes) => {
    const LeaveRequest = sequelize.define(
      "LeaveRequest",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        student_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        reason: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM("pending", "accepted", "rejected"),
          allowNull: false,
          defaultValue: "pending",
        },
      },
      {
        tableName: "leave_requests",
        underscored: true, // so that created_at and updated_at are used
        timestamps: true,
      }
    );
  
    LeaveRequest.associate = (models) => {
      // A leave request belongs to a student.
      LeaveRequest.belongsTo(models.Student, {
        foreignKey: "student_id",
        as: "Student",
      });
    };
  
    return LeaveRequest;
  };
  