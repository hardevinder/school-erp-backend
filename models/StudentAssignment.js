'use strict';
module.exports = (sequelize, DataTypes) => {
  const StudentAssignment = sequelize.define('StudentAssignment', {
    assignmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'submitted', 'graded'),
      allowNull: false,
      defaultValue: 'pending',
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    grade: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    remarks: {
      type: DataTypes.STRING, // Change to DataTypes.TEXT if needed
      allowNull: true,
    }
  }, {});

  StudentAssignment.associate = function(models) {
    // Each StudentAssignment belongs to an Assignment
    StudentAssignment.belongsTo(models.Assignment, {
      foreignKey: 'assignmentId',
      as: 'Assignment',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    
    // Each StudentAssignment belongs to a Student
    StudentAssignment.belongsTo(models.Student, {
      foreignKey: 'studentId',
      as: 'Student',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  return StudentAssignment;
};
