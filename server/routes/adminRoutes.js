const express = require('express');
const router = express.Router();
const { getPendingUsers, handleUserApproval } = require('../controllers/authController');
const { handleTaskAction, getPendingTaskActions } = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// Admin routes
router.get('/pending-users', getPendingUsers);
router.post('/users/:userId/approve', (req, res) => handleUserApproval(req, res, 'approve'));
router.post('/users/:userId/reject', (req, res) => handleUserApproval(req, res, 'reject'));

// Task action approval routes
router.get('/tasks/actions/pending', getPendingTaskActions);
router.post('/tasks/actions/:actionId/approve', (req, res) => {
  req.body.status = 'approve';
  handleTaskAction(req, res);
});

router.post('/tasks/actions/:actionId/reject', (req, res) => {
  req.body.status = 'reject';
  handleTaskAction(req, res);
});

module.exports = router; 