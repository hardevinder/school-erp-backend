'use strict';
module.exports = (sequelize, DataTypes) => {
  const Assignment = sequelize.define('Assignment', {
    teacherId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // New subjectId column
    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    youtubeUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {});

  Assignment.associate = function(models) {
    // Association with the User model for teachers
    Assignment.belongsTo(models.User, { foreignKey: 'teacherId', as: 'Teacher' });
    
    // New association with Subject model using alias 'subject' for consistency
    Assignment.belongsTo(models.Subject, { foreignKey: 'subjectId', as: 'subject' });
    
    // One Assignment can be assigned to many students
    Assignment.hasMany(models.StudentAssignment, {
      foreignKey: 'assignmentId',
      as: 'StudentAssignments'
    });
    
    // Assignment has many files (if using AssignmentFile)
    Assignment.hasMany(models.AssignmentFile, {
      foreignKey: 'assignmentId',
      as: 'AssignmentFiles'
    });
  };

  return Assignment;
};
