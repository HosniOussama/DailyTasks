const express = require('express');
const { createTask, getTasks } = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.post('/', createTask);
router.get('/', getTasks);

module.exports = router;