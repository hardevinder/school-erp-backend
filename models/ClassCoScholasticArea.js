module.exports = (sequelize, DataTypes) => {
  const ClassCoScholasticArea = sequelize.define("ClassCoScholasticArea", {
    class_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    area_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    term_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: "ClassCoScholasticAreas",
    timestamps: true,
  });

  ClassCoScholasticArea.associate = (models) => {
    ClassCoScholasticArea.belongsTo(models.Class, {
      foreignKey: "class_id",
      as: "class",
    });

    ClassCoScholasticArea.belongsTo(models.CoScholasticArea, {
      foreignKey: "area_id",
      as: "area",
    });

    ClassCoScholasticArea.belongsTo(models.Term, {
      foreignKey: "term_id",
      as: "term",
    });
  };

  return ClassCoScholasticArea;
};
