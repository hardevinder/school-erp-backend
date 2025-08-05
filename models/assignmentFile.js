'use strict';
module.exports = (sequelize, DataTypes) => {
  const AssignmentFile = sequelize.define('AssignmentFile', {
    assignmentId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {});

  AssignmentFile.associate = function(models) {
    AssignmentFile.belongsTo(models.Assignment, {
      foreignKey: 'assignmentId',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  return AssignmentFile;
};
