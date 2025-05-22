const Task = require('../models/Task');

const createTask = async (req, res) => {
  const { title } = req.body;
  try {
    const task = await Task.create({
      title,
      userId: req.user.id,
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error creating task' });
  }
};

const getTasks = async (req, res) => {
  try {
    const tasks = await Task.findAll({ where: { userId: req.user.id } });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks' });
  }
};

module.exports = { createTask, getTasks };