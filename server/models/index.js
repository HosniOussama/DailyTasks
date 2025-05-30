'use strict';

const Sequelize = require('sequelize');
const process = require('process');
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

// Create Sequelize instance
const sequelize = config.use_env_variable
  ? new Sequelize(process.env[config.use_env_variable], config)
  : new Sequelize(config.database, config.username, config.password, config);

// Import models
const User = require('./User');
const Task = require('./Task');
const PendingTask = require('./PendingTask');

// Define associations
User.hasMany(Task, {
  foreignKey: 'userId',
  onDelete: 'CASCADE'
});

Task.belongsTo(User, {
  foreignKey: 'userId'
});

User.hasMany(PendingTask, {
  foreignKey: 'userId',
  onDelete: 'CASCADE'
});

PendingTask.belongsTo(User, {
  foreignKey: 'userId'
});

Task.hasMany(PendingTask, {
  foreignKey: 'taskId',
  onDelete: 'CASCADE'
});

PendingTask.belongsTo(Task, {
  foreignKey: 'taskId'
});

// Export models and Sequelize instance
module.exports = {
  sequelize,
  Sequelize,
  User,
  Task,
  PendingTask
};
