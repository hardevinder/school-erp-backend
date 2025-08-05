module.exports = (sequelize, DataTypes) => {
    const Circular = sequelize.define('Circular', {
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      fileUrl: { type: DataTypes.STRING, allowNull: true },
      audience: { 
        type: DataTypes.ENUM('teacher', 'student', 'both'),
        defaultValue: 'both'
      }
    });
    return Circular;
  };
  