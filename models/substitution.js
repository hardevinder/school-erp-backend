// models/Substitution.js
'use strict';

module.exports = (sequelize, DataTypes) => {
  const Substitution = sequelize.define('Substitution', {
    date:      { type: DataTypes.DATEONLY, allowNull: false },
    periodId:  { type: DataTypes.INTEGER,  allowNull: false },
    classId:   { type: DataTypes.INTEGER,  allowNull: false },

    // These are Users.id (NOT Employee)
    teacherId:           { type: DataTypes.INTEGER, allowNull: false },
    original_teacherId:  { type: DataTypes.INTEGER, allowNull: false },

    subjectId: { type: DataTypes.INTEGER, allowNull: false },
    day:       { type: DataTypes.ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'), allowNull: false },
    published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, {
    tableName: 'Substitutions',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { name: 'idx_subs_date_day_period',   fields: ['date', 'day', 'periodId'] },
      { name: 'idx_subs_class_period',      fields: ['classId', 'periodId'] },
      { name: 'idx_subs_teacher',           fields: ['teacherId'] },
      { name: 'uniq_subs_date_day_period_class', unique: true, fields: ['date', 'day', 'periodId', 'classId'] },
    ],
  });

  Substitution.associate = (models) => {
    Substitution.belongsTo(models.Period,  { foreignKey: 'periodId', as: 'Period',  onUpdate: 'CASCADE', onDelete: 'RESTRICT' });
    Substitution.belongsTo(models.Class,   { foreignKey: 'classId',  as: 'Class',   onUpdate: 'CASCADE', onDelete: 'RESTRICT' });
    Substitution.belongsTo(models.Subject, { foreignKey: 'subjectId',as: 'Subject', onUpdate: 'CASCADE', onDelete: 'RESTRICT' });

    // 🔁 Join to User because teacherId/original_teacherId are Users.id
    Substitution.belongsTo(models.User, { foreignKey: 'teacherId',          as: 'Teacher',         onUpdate: 'CASCADE', onDelete: 'RESTRICT' });
    Substitution.belongsTo(models.User, { foreignKey: 'original_teacherId', as: 'OriginalTeacher', onUpdate: 'CASCADE', onDelete: 'RESTRICT' });
  };

  return Substitution;
};
