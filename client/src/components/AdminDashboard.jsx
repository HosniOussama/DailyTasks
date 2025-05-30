import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/AdminDashboard.css';

function AdminDashboard({ onLogout }) {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();
  
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!token || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchPendingUsers();
    fetchPendingActions();
  }, [token, navigate]);

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const fetchPendingUsers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/pending-users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingUsers(res.data);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      showMessage('Error fetching pending users', 'error');
    }
  };

  const fetchPendingActions = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/tasks/actions/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingActions(res.data);
    } catch (error) {
      console.error('Error fetching pending actions:', error);
      showMessage('Error fetching pending task actions', 'error');
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      await axios.post(`http://localhost:5000/api/admin/users/${userId}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showMessage(`User ${action}d successfully`);
      fetchPendingUsers();
    } catch (error) {
      console.error('Error handling user action:', error);
      showMessage('Error processing user action', 'error');
    }
  };

  const handleTaskAction = async (actionId, status) => {
    try {
      const response = await axios.post(`http://localhost:5000/api/admin/tasks/actions/${actionId}/${status}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showMessage(`Task action ${status}d successfully`);
      fetchPendingActions();
    } catch (error) {
      console.error('Error handling task action:', error);
      const errorMessage = error.response?.data?.message || 'Error processing task action';
      showMessage(errorMessage, 'error');
      // Refresh the list to get updated status
      fetchPendingActions();
    }
  };

  const getActionDescription = (action) => {
    const actionTypes = {
      create: 'Create new task',
      edit: 'Edit task',
      delete: 'Delete task',
      complete: 'Toggle completion'
    };
    return actionTypes[action.actionType] || action.actionType;
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>DailyTasks Admin</h1>
        <div className="user-info">
          <span>Welcome, {user.username}!</span>
          <button 
            onClick={onLogout}
            className="logout-button"
          >
            Logout
          </button>
        </div>
      </header>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="dashboard-container">
        {/* Left Panel - User Registrations */}
        <div className="dashboard-panel users-panel">
          <div className="panel-header">
            <h2>Pending Registrations</h2>
            <span className="count-badge">{pendingUsers.length}</span>
          </div>
          
          <div className="panel-content">
            {pendingUsers.length === 0 ? (
              <p className="no-items">No pending registrations</p>
            ) : (
              <div className="users-list">
                {pendingUsers.map(user => (
                  <div key={user.id} className="user-card">
                    <div className="user-info">
                      <div className="user-header">
                        <h3>{user.username}</h3>
                        <span className={`role-badge ${user.role}`}>
                          {user.role}
                        </span>
                      </div>
                      <p className="email">{user.email}</p>
                    </div>
                    <div className="action-buttons">
                      <button
                        className="approve-button"
                        onClick={() => handleUserAction(user.id, 'approve')}
                      >
                        Approve
                      </button>
                      <button
                        className="reject-button"
                        onClick={() => handleUserAction(user.id, 'reject')}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Task Actions */}
        <div className="dashboard-panel actions-panel">
          <div className="panel-header">
            <h2>Pending Task Actions</h2>
            <span className="count-badge">{pendingActions.length}</span>
          </div>
          
          <div className="panel-content">
            {pendingActions.length === 0 ? (
              <p className="no-items">No pending task actions</p>
            ) : (
              <div className="actions-list">
                {pendingActions.map(action => (
                  <div key={action.id} className="action-card">
                    <div className="action-info">
                      <div className="action-header">
                        <h3>{getActionDescription(action)}</h3>
                        <span className={`action-type ${action.actionType}`}>
                          {action.actionType}
                        </span>
                      </div>
                      <p className="user">Requested by: {action.User?.username}</p>
                      {action.actionType === 'create' && (
                        <div className="changes">
                          <p>New Task Details:</p>
                          <div className="task-details-table">
                            <div className="table-row">
                              <div className="table-cell header">Title</div>
                              <div className="table-cell">{action.taskData.title}</div>
                            </div>
                            <div className="table-row">
                              <div className="table-cell header">Description</div>
                              <div className="table-cell">{action.taskData.description || '-'}</div>
                            </div>
                          </div>
                        </div>
                      )}
                      {action.actionType === 'edit' && (
                        <div className="changes">
                          <p>Proposed Changes:</p>
                          <div className="task-details-table">
                            <div className="table-row">
                              <div className="table-cell header">Title</div>
                              <div className="table-cell">{action.taskData.title}</div>
                            </div>
                            <div className="table-row">
                              <div className="table-cell header">Description</div>
                              <div className="table-cell">{action.taskData.description || '-'}</div>
                            </div>
                          </div>
                        </div>
                      )}
                      {action.actionType === 'complete' && (
                        <p>Action: Mark task as {action.taskData.completed ? 'completed' : 'incomplete'}</p>
                      )}
                      {action.Task && (
                        <p className="task-title">Task: {action.Task.title}</p>
                      )}
                    </div>
                    <div className="action-buttons">
                      <button
                        className="approve-button"
                        onClick={() => handleTaskAction(action.id, 'approve')}
                      >
                        Approve
                      </button>
                      <button
                        className="reject-button"
                        onClick={() => handleTaskAction(action.id, 'reject')}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard; 