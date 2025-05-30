const Task = require('../models/Task');
const PendingTask = require('../models/PendingTask');
const User = require('../models/User');
const { Op } = require('sequelize');

// Get all tasks for the authenticated user
const getTasks = async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { userId: req.user.id },
      include: [{
        model: PendingTask,
        where: { status: 'pending' },
        required: false,
        attributes: ['id', 'actionType', 'status', 'taskData']
      }],
      order: [['createdAt', 'DESC']]
    });

    // Format tasks with pending actions info
    const formattedTasks = tasks.map(task => {
      const taskJson = task.toJSON();
      const pendingActions = taskJson.PendingTasks || [];
      
      // Check for pending actions
      const hasPendingDelete = pendingActions.some(action => action.actionType === 'delete');
      const hasPendingComplete = pendingActions.some(action => action.actionType === 'complete');
      const hasPendingEdit = pendingActions.some(action => action.actionType === 'edit');

      return {
        ...taskJson,
        pendingActions: pendingActions.map(action => ({
          id: action.id,
          type: action.actionType,
          data: action.taskData
        })),
        canEdit: !hasPendingDelete && !hasPendingComplete,
        canDelete: !hasPendingDelete && !hasPendingComplete && !hasPendingEdit,
        canComplete: !hasPendingDelete && !hasPendingEdit
      };
    });

    res.json(formattedTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      message: 'Error fetching tasks',
      error: error.message
    });
  }
};

// Create a new task (requires approval)
const createTask = async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.user.id;

    // Create pending task action
    const pendingTask = await PendingTask.create({
      userId,
      actionType: 'create',
      taskData: { title, description },
      status: 'pending'
    });

    res.status(201).json({
      message: 'Task creation request submitted for approval',
      pendingTaskId: pendingTask.id
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      message: 'Error submitting task creation request',
      error: error.message
    });
  }
};

// Update a task (requires approval)
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const userId = req.user.id;

    // Check if task exists
    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Create pending task action
    const pendingTask = await PendingTask.create({
      userId,
      taskId: id,
      actionType: 'edit',
      taskData: { title, description },
      status: 'pending'
    });

    res.json({
      message: 'Task update request submitted for approval',
      pendingTaskId: pendingTask.id
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      message: 'Error submitting task update request',
      error: error.message
    });
  }
};

// Delete a task (requires approval)
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if task exists
    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Create pending task action
    const pendingTask = await PendingTask.create({
      userId,
      taskId: id,
      actionType: 'delete',
      status: 'pending'
    });

    res.json({
      message: 'Task deletion request submitted for approval',
      pendingTaskId: pendingTask.id
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      message: 'Error submitting task deletion request',
      error: error.message
    });
  }
};

// Toggle task completion (requires approval)
const toggleComplete = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if task exists and belongs to the user
    const task = await Task.findOne({
      where: {
        id: id,
        userId: userId
      }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found or unauthorized' });
    }

    // Check for existing pending complete actions
    const existingPendingAction = await PendingTask.findOne({
      where: {
        taskId: id,
        actionType: 'complete',
        status: 'pending'
      }
    });

    if (existingPendingAction) {
      return res.status(400).json({ 
        message: 'A completion request for this task is already pending'
      });
    }

    // Create pending task action
    const pendingTask = await PendingTask.create({
      userId,
      taskId: id,
      actionType: 'complete',
      taskData: { completed: !task.completed },
      status: 'pending'
    });

    res.json({
      message: 'Task completion toggle request submitted for approval',
      pendingTaskId: pendingTask.id
    });
  } catch (error) {
    console.error('Error toggling task completion:', error);
    res.status(500).json({
      message: 'Error submitting task completion toggle request',
      error: error.message
    });
  }
};

// Handle task action approval/rejection (admin only)
const handleTaskAction = async (req, res) => {
  try {
    const { actionId } = req.params;
    const { status } = req.body;

    if (!['approve', 'reject'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const pendingTask = await PendingTask.findByPk(actionId, {
      include: [
        { model: User, attributes: ['username'] },
        { model: Task, attributes: ['id', 'title', 'completed'] }
      ]
    });

    if (!pendingTask) {
      return res.status(404).json({ message: 'Pending task action not found' });
    }

    // For actions that require an existing task, check if it exists
    if (['edit', 'delete', 'complete'].includes(pendingTask.actionType)) {
      if (!pendingTask.Task) {
        await pendingTask.update({ status: 'reject' });
        return res.status(404).json({ 
          message: 'The task no longer exists. Action has been automatically rejected.',
          pendingTaskId: pendingTask.id,
          actionType: pendingTask.actionType
        });
      }
    }

    if (status === 'approve') {
      try {
        let notificationMessage = '';
        switch (pendingTask.actionType) {
          case 'create':
            await Task.create({
              title: pendingTask.taskData.title,
              description: pendingTask.taskData.description,
              userId: pendingTask.userId,
              completed: false
            });
            notificationMessage = 'Your task has been created successfully';
            break;

          case 'edit':
            const [updatedRows] = await Task.update(
              {
                title: pendingTask.taskData.title,
                description: pendingTask.taskData.description
              },
              { 
                where: { id: pendingTask.taskId },
                returning: true
              }
            );
            if (updatedRows === 0) {
              throw new Error('Task not found or no changes made');
            }
            notificationMessage = 'Your task has been updated successfully';
            break;

          case 'delete':
            // First, reject all other pending actions for this task
            await PendingTask.update(
              { status: 'reject' },
              { 
                where: { 
                  taskId: pendingTask.taskId,
                  id: { [Op.ne]: actionId },
                  status: 'pending'
                }
              }
            );
            
            // Then delete the task
            const deletedRows = await Task.destroy({
              where: { id: pendingTask.taskId }
            });
            
            if (deletedRows === 0) {
              throw new Error('Task not found or already deleted');
            }
            notificationMessage = 'Your task has been deleted successfully';
            break;

          case 'complete':
            // First, reject any pending delete actions
            await PendingTask.update(
              { status: 'reject' },
              {
                where: {
                  taskId: pendingTask.taskId,
                  actionType: 'delete',
                  status: 'pending'
                }
              }
            );

            const [completedRows] = await Task.update(
              { completed: pendingTask.taskData.completed },
              { 
                where: { id: pendingTask.taskId },
                returning: true
              }
            );
            if (completedRows === 0) {
              throw new Error('Task not found or no changes made');
            }
            notificationMessage = `Your task has been marked as ${pendingTask.taskData.completed ? 'completed' : 'incomplete'}`;
            break;
        }

        // Update the pendingTask with the notification message
        await pendingTask.update({ 
          status,
          taskData: {
            ...pendingTask.taskData,
            notificationMessage
          }
        });

        res.json({
          message: `Task action ${status}d successfully`,
          pendingTaskId: pendingTask.id,
          actionType: pendingTask.actionType,
          notificationMessage
        });
        return;
      } catch (actionError) {
        console.error('Error executing task action:', actionError);
        await pendingTask.update({ status: 'reject' });
        return res.status(400).json({
          message: `Could not ${pendingTask.actionType} task: ${actionError.message}`,
          pendingTaskId: pendingTask.id,
          actionType: pendingTask.actionType
        });
      }
    }

    await pendingTask.update({ status });

    res.json({
      message: `Task action ${status}d successfully`,
      pendingTaskId: pendingTask.id,
      actionType: pendingTask.actionType
    });
  } catch (error) {
    console.error('Error handling task action:', error);
    res.status(500).json({
      message: 'Error processing task action',
      error: error.message
    });
  }
};

// Get all pending task actions (admin only)
const getPendingTaskActions = async (req, res) => {
  try {
    const pendingActions = await PendingTask.findAll({
      where: { status: 'pending' },
      include: [
        {
          model: User,
          attributes: ['username']
        },
        {
          model: Task,
          attributes: ['title'],
          required: false // For create actions where taskId is null
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(pendingActions);
  } catch (error) {
    console.error('Error fetching pending task actions:', error);
    res.status(500).json({
      message: 'Error fetching pending task actions',
      error: error.message
    });
  }
};

module.exports = {
  createTask,
  updateTask,
  deleteTask,
  toggleComplete,
  getTasks,
  handleTaskAction,
  getPendingTaskActions
};