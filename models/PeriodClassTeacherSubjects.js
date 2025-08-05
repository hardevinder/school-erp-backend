'use strict';
module.exports = (sequelize, DataTypes) => {
  const PeriodClassTeacherSubject = sequelize.define('PeriodClassTeacherSubject', {
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
    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    day: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    effectFrom: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    published: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    combinationId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Additional fields
    subjectId_2: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    teacherId_2: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    subjectId_3: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    teacherId_3: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    subjectId_4: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    teacherId_4: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    subjectId_5: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    teacherId_5: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {});

  PeriodClassTeacherSubject.associate = function(models) {
    // Original associations
    PeriodClassTeacherSubject.belongsTo(models.Period, {
      foreignKey: 'periodId',
      as: 'Period'
    });
    PeriodClassTeacherSubject.belongsTo(models.Class, {
      foreignKey: 'classId',
      as: 'Class'
    });
    PeriodClassTeacherSubject.belongsTo(models.User, {
      foreignKey: 'teacherId',
      as: 'Teacher'
    });
    PeriodClassTeacherSubject.belongsTo(models.Subject, {
      foreignKey: 'subjectId',
      as: 'Subject'
    });

    // Additional associations mirroring the above
    PeriodClassTeacherSubject.belongsTo(models.User, {
      foreignKey: 'teacherId_2',
      as: 'Teacher2'
    });
    PeriodClassTeacherSubject.belongsTo(models.Subject, {
      foreignKey: 'subjectId_2',
      as: 'Subject2'
    });
    PeriodClassTeacherSubject.belongsTo(models.User, {
      foreignKey: 'teacherId_3',
      as: 'Teacher3'
    });
    PeriodClassTeacherSubject.belongsTo(models.Subject, {
      foreignKey: 'subjectId_3',
      as: 'Subject3'
    });
    PeriodClassTeacherSubject.belongsTo(models.User, {
      foreignKey: 'teacherId_4',
      as: 'Teacher4'
    });
    PeriodClassTeacherSubject.belongsTo(models.Subject, {
      foreignKey: 'subjectId_4',
      as: 'Subject4'
    });
    PeriodClassTeacherSubject.belongsTo(models.User, {
      foreignKey: 'teacherId_5',
      as: 'Teacher5'
    });
    PeriodClassTeacherSubject.belongsTo(models.Subject, {
      foreignKey: 'subjectId_5',
      as: 'Subject5'
    });
  };

  return PeriodClassTeacherSubject;
};