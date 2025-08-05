// attendance.js
module.exports = (sequelize, DataTypes) => {
    const Attendance = sequelize.define('Attendance', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      studentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Students',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('present', 'absent', 'late','leave','holiday'),
        allowNull: false,
        defaultValue: 'present'
      },
      remarks: {
        type: DataTypes.STRING,
        allowNull: true
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID of the user who created this attendance record'
      }
    }, {
      tableName: 'Attendances',
      indexes: [
        {
          unique: true,
          fields: ['studentId', 'date']
        }
      ],
      timestamps: true
    });
  
    // Define all associations inside the associate function so that "models" is defined
    Attendance.associate = models => {
      Attendance.belongsTo(models.Student, {
        foreignKey: 'studentId',
        as: 'student'
      });
      Attendance.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator'
      });
    };
  
    return Attendance;
  };
  