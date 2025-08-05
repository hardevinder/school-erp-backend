'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(path.join(__dirname, '/../config/config.json'))[env];
const db = {};

let sequelize;

// Initialize Sequelize instance
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// Dynamically load all models in the current directory
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf('.') !== 0 && // Ignore hidden files
      file !== basename && // Ignore this file (index.js)
      file.slice(-3) === '.js' && // Only .js files
      file.indexOf('.test.js') === -1 // Ignore test files
    );
  })
  .forEach((file) => {
    try {
      console.log(`Loading model: ${file}`);
      const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);

      if (!model || !model.name) {
        console.error(`Invalid model exported from ${file}. Skipping.`);
        return;
      }

      db[model.name] = model;
    } catch (error) {
      console.error(`Error loading model ${file}:`, error.message);
    }
  });
  console.log("Loaded Models Here:", Object.keys(db));

  
// Initialize associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    try {
      db[modelName].associate(db);
      console.log(`Associations initialized for model: ${modelName}`);
    } catch (error) {
      console.error(
        `Error initializing associations for model ${modelName}:`,
        error.message
      );
    }
  }
});

// Test Sequelize connection
sequelize
  .authenticate()
  .then(() => console.log('Database connection successful'))
  .catch((err) => console.error('Database connection failed:', err.message));

// Add Sequelize instance and Sequelize library to the db object
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
