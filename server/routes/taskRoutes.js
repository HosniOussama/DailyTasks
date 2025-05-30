const express = require('express');
const router = express.Router();
const { getTasks, createTask, updateTask, deleteTask, toggleComplete } = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');
const PendingTask = require('../models/PendingTask');

// Protect all routes
router.use(authMiddleware);

// Get all tasks
router.get('/', getTasks);

// Get pending tasks
router.get('/pending', async (req, res) => {
  try {
    const pendingTasks = await PendingTask.findAll({
      where: {
        userId: req.user.id,
        status: 'pending'
      },
      order: [['createdAt', 'DESC']]
    });
    res.json(pendingTasks);
  } catch (error) {
    console.error('Error fetching pending tasks:', error);
    res.status(500).json({
      message: 'Error fetching pending tasks',
      error: error.message
    });
  }
});

// Create a new task
router.post('/', createTask);

// Update a task
router.put('/:id', updateTask);

// Delete a task
router.delete('/:id', deleteTask);

// Toggle task completion
router.patch('/:id/complete', toggleComplete);

// Mark notification as shown
router.patch('/actions/:actionId/mark-shown', async (req, res) => {
  try {
    const { actionId } = req.params;
    const pendingTask = await PendingTask.findByPk(actionId);
    
    if (!pendingTask) {
      return res.status(404).json({ message: 'Action not found' });
    }

    await pendingTask.update({
      taskData: {
        ...pendingTask.taskData,
        notificationShown: true
      }
    });

    res.json({ message: 'Notification marked as shown' });
  } catch (error) {
    console.error('Error marking notification as shown:', error);
    res.status(500).json({ message: 'Error marking notification as shown' });
  }
});

module.exports = router;