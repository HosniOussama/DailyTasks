import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Home.css';
import backgroundImage from '/background.jpg';
import TaskStatistics from './TaskStatistics';

function Home({ onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', description: '' });
  const [editingTask, setEditingTask] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [pendingActions, setPendingActions] = useState([]);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();
  
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Add the background image style directly
  const containerStyle = {
    backgroundImage: `url(${backgroundImage})`,
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchTasks();
    fetchPendingActions();
  }, [token, navigate]);

  const fetchTasks = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(res.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      showMessage(error.response?.data?.message || 'Error fetching tasks', 'error');
    }
  };

  const fetchPendingActions = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/tasks/pending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingActions(res.data);

      // Check for notifications in completed actions
      const completedActions = res.data.filter(action => 
        action.status === 'approve' && 
        action.taskData?.notificationMessage &&
        !action.notificationShown // Only show notifications once
      );

      // Show notifications for completed actions
      completedActions.forEach(action => {
        showMessage(action.taskData.notificationMessage, 'success');
        // Mark notification as shown
        axios.patch(`http://localhost:5000/api/tasks/actions/${action.id}/mark-shown`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      });
    } catch (error) {
      console.error('Error fetching pending actions:', error);
    }
  };

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleAction = async (taskId, action, data = {}) => {
    try {
      let endpoint = '';
      let method = 'post';
      let successMessage = '';
      
      switch (action) {
        case 'create':
          endpoint = '/api/tasks';
          successMessage = 'Task creation request submitted for approval';
          break;
        case 'edit':
          endpoint = `/api/tasks/${taskId}`;
          method = 'put';
          successMessage = 'Task update request submitted for approval';
          break;
        case 'delete':
          endpoint = `/api/tasks/${taskId}`;
          method = 'delete';
          successMessage = 'Task deletion request submitted for approval';
          break;
        case 'complete':
          endpoint = `/api/tasks/${taskId}/complete`;
          method = 'patch';
          successMessage = 'Task completion request submitted for approval';
          break;
        default:
          throw new Error('Invalid action');
      }

      await axios({
        method,
        url: `http://localhost:5000${endpoint}`,
        data,
        headers: { Authorization: `Bearer ${token}` }
      });

      showMessage(successMessage);
      await fetchTasks(); // Wait for tasks to be fetched
      if (action === 'edit') {
        setEditingTask(null);
        setNewTask({ title: '', description: '' });
      }
    } catch (error) {
      console.error(`Error ${action} task:`, error);
      const errorMessage = error.response?.data?.message || `Error ${action} task`;
      showMessage(errorMessage, 'error');
      
      // Refresh tasks list even on error to ensure UI is in sync
      await fetchTasks();
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const isPendingAction = (taskId, actionType) => {
    const task = tasks.find(t => t.id === taskId);
    return task?.pendingActions?.some(action => action.type === actionType) || false;
  };

  // Drag and Drop handlers
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.target.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDraggedTask(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    const taskItem = e.target.closest('.task-item');
    if (taskItem) {
      const bounding = taskItem.getBoundingClientRect();
      const middle = bounding.top + bounding.height / 2;
      if (e.clientY < middle) {
        taskItem.classList.add('drag-over-top');
        taskItem.classList.remove('drag-over-bottom');
      } else {
        taskItem.classList.add('drag-over-bottom');
        taskItem.classList.remove('drag-over-top');
      }
    }
  };

  const handleDragLeave = (e) => {
    const taskItem = e.target.closest('.task-item');
    if (taskItem) {
      taskItem.classList.remove('drag-over-top', 'drag-over-bottom');
    }
  };

  const handleDrop = (e, targetTask) => {
    e.preventDefault();
    const taskItem = e.target.closest('.task-item');
    if (taskItem) {
      taskItem.classList.remove('drag-over-top', 'drag-over-bottom');
    }

    if (!draggedTask || draggedTask.id === targetTask.id) return;

    const oldIndex = tasks.findIndex(t => t.id === draggedTask.id);
    const newIndex = tasks.findIndex(t => t.id === targetTask.id);
    
    const newTasks = [...tasks];
    newTasks.splice(oldIndex, 1);
    newTasks.splice(newIndex, 0, draggedTask);
    
    setTasks(newTasks);
  };

  return (
    <div className="home-container" style={containerStyle}>
      <header className="header" style={containerStyle}>
        <h1>DailyTasks</h1>
        <div className="user-info">
          <span>Welcome, {user.username}!</span>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </div>
      </header>

      <div className="content">
        <TaskStatistics tasks={tasks} />

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!newTask.title.trim()) {
            showMessage('Please enter a task title', 'error');
            return;
          }
          await handleAction(null, 'create', newTask);
          setNewTask({ title: '', description: '' });
        }} className="task-form">
          <input
            type="text"
            placeholder="Task title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            required
          />
          <textarea
            placeholder="Task description (optional)"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
          />
          <button type="submit">
            Request New Task
          </button>
        </form>

        <div className="tasks-list">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`task-item ${task.completed ? 'completed' : ''} ${
                task.pendingActions?.length > 0 ? 'pending-action' : ''
              }`}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, task)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, task)}
            >
              <div className="task-content">
                {editingTask === task.id ? (
                  <div className="edit-form">
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Task title"
                      required
                    />
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="Task description (optional)"
                    />
                  </div>
                ) : (
                  <>
                    <h3>{task.title}</h3>
                    {task.description && <p>{task.description}</p>}
                    {task.pendingActions?.map(action => (
                      <span key={action.id} className={`pending-badge ${action.type}`}>
                        {action.type === 'edit' && 'Edit pending'}
                        {action.type === 'delete' && 'Delete pending'}
                        {action.type === 'complete' && 
                          `${task.completed ? 'Mark incomplete' : 'Mark complete'} pending`
                        }
                      </span>
                    ))}
                  </>
                )}
              </div>
              <div className="task-actions">
                {task.canEdit && (
                  <button
                    onClick={() => {
                      if (editingTask === task.id) {
                        // Submit the edit
                        handleAction(task.id, 'edit', newTask);
                      } else {
                        // Start editing
                        setEditingTask(task.id);
                        setNewTask({
                          title: task.title,
                          description: task.description || ''
                        });
                      }
                    }}
                    className="edit-button"
                  >
                    {editingTask === task.id ? 'Save' : 'Edit'}
                  </button>
                )}
                {editingTask === task.id && (
                  <button
                    onClick={() => {
                      setEditingTask(null);
                      setNewTask({ title: '', description: '' });
                    }}
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                )}
                {task.canComplete && (
                  <button
                    onClick={() => handleAction(task.id, 'complete')}
                    className="toggle-button"
                  >
                    {task.completed ? 'Mark Incomplete' : 'Complete'}
                  </button>
                )}
                {task.canDelete && (
                  <button
                    onClick={() => handleAction(task.id, 'delete')}
                    className="delete-button"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="no-tasks">No tasks yet. Add your first task above!</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;