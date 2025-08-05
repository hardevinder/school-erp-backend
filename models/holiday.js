module.exports = (sequelize, DataTypes) => {
    const Holiday = sequelize.define(
      "Holiday",
      {
        classId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        description: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        createdBy: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
      },
      {}
    );
  
    Holiday.associate = function (models) {
      // Assuming you have a Class model defined (you might have it as 'Class' or 'classes')
      Holiday.belongsTo(models.Class, { foreignKey: "classId", as: "class" });
      // Assuming you have a User model to track who created the holiday marking
      Holiday.belongsTo(models.User, { foreignKey: "createdBy", as: "creator" });
    };
  
    return Holiday;
  };
  