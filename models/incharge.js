module.exports = (sequelize, DataTypes) => {
    const Incharge = sequelize.define('Incharge', {
      classId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      sectionId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      teacherId: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    }, {});
  
    // Fix association aliasing
    Incharge.associate = function(models) {
      Incharge.belongsTo(models.Class, { foreignKey: 'classId' });
      Incharge.belongsTo(models.Section, { foreignKey: 'sectionId' });
      Incharge.belongsTo(models.User, { foreignKey: 'teacherId', as: 'Teacher' }); // Ensure alias is "Teacher"
    };
  
    return Incharge;
  };
  