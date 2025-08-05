const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('FeePanel', 'hardevinder', 'Admin@1234567', {
    host: 'localhost',
    dialect: 'mysql',
});

module.exports = sequelize;
