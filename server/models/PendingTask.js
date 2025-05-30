const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class PendingTask extends Model {}

PendingTask.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  taskId: {
    type: DataTypes.INTEGER,
    allowNull: true // Null for new task creation
  },
  actionType: {
    type: DataTypes.ENUM('create', 'edit', 'delete', 'complete'),
    allowNull: false,
    validate: {
      isIn: {
        args: [['create', 'edit', 'delete', 'complete']],
        msg: 'Invalid action type'
      }
    }
  },
  taskData: {
    type: DataTypes.JSON,
    allowNull: true, // Contains new task data or changes
    validate: {
      validateTaskData(value) {
        if (this.actionType === 'create' || this.actionType === 'edit') {
          if (!value || !value.title) {
            throw new Error('Task data must include a title');
          }
        }
      }
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'approve', 'reject'),
    defaultValue: 'pending',
    validate: {
      isIn: {
        args: [['pending', 'approve', 'reject']],
        msg: 'Invalid status'
      }
    }
  }
}, {
  sequelize,
  modelName: 'PendingTask',
  tableName: 'pending_tasks',
  timestamps: true
});

module.exports = PendingTask; 