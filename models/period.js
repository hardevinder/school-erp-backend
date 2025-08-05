'use strict';
module.exports = (sequelize, DataTypes) => {
  const Period = sequelize.define('Period', {
    period_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.STRING, // Changed from TIME to STRING
      allowNull: false,
    },
    end_time: {
      type: DataTypes.STRING, // Changed from TIME to STRING
      allowNull: false,
    }
  }, {});

  Period.associate = function(models) {
    // Define associations here if needed.
  };

  return Period;
};
