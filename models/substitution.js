'use strict';
module.exports = (sequelize, DataTypes) => {
  const Substitution = sequelize.define('Substitution', {
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    periodId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    classId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    teacherId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    original_teacherId: {  // New Field Added
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    day: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    published: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    }
  }, {});

  Substitution.associate = function(models) {
    // Define associations
    Substitution.belongsTo(models.Period, {
      foreignKey: 'periodId',
      as: 'Period'
    });
    Substitution.belongsTo(models.Class, {
      foreignKey: 'classId',
      as: 'Class'
    });
    Substitution.belongsTo(models.User, {
      foreignKey: 'teacherId',
      as: 'Teacher'
    });
    Substitution.belongsTo(models.Subject, {
      foreignKey: 'subjectId',
      as: 'Subject'
    });
    // New association for original teacher.
    Substitution.belongsTo(models.User, {
      foreignKey: 'original_teacherId',
      as: 'OriginalTeacher'
    });
  };

  return Substitution;
};
