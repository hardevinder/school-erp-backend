// models/Substitution.js
'use strict';

module.exports = (sequelize, DataTypes) => {
  const Substitution = sequelize.define('Substitution', {
    date: {
      type: DataTypes.DATEONLY, // "YYYY-MM-DD"
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

    // Store Employee IDs (not User IDs)
    teacherId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    original_teacherId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    day: {
      type: DataTypes.ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'),
      allowNull: false,
    },

    published: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  }, {
    tableName: 'Substitutions',   // <-- exact table name (capital S)
    freezeTableName: true,        // don't pluralize/transform
    timestamps: true,
    indexes: [
      // Helpful lookups
      { name: 'idx_subs_date_day_period',   fields: ['date', 'day', 'periodId'] },
      { name: 'idx_subs_class_period',      fields: ['classId', 'periodId'] },
      { name: 'idx_subs_teacher',           fields: ['teacherId'] },
      // Enforce one substitution per class/period/day/date
      { name: 'uniq_subs_date_day_period_class', unique: true, fields: ['date', 'day', 'periodId', 'classId'] },
    ],
  });

  Substitution.associate = (models) => {
    // Core relations
    Substitution.belongsTo(models.Period,  {
      foreignKey: 'periodId',
      as: 'Period',
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    Substitution.belongsTo(models.Class,   {
      foreignKey: 'classId',
      as: 'Class',
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    Substitution.belongsTo(models.Subject, {
      foreignKey: 'subjectId',
      as: 'Subject',
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    // Teachers now point to Employee
    // Make sure your Employee model alias to User is: Employee.belongsTo(User, { as: 'user', ... })
    Substitution.belongsTo(models.Employee, {
      foreignKey: 'teacherId',
      as: 'Teacher',
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    Substitution.belongsTo(models.Employee, {
      foreignKey: 'original_teacherId',
      as: 'OriginalTeacher',
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
  };

  return Substitution;
};
