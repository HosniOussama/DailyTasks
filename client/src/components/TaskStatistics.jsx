import { useMemo } from 'react';
import '../styles/TaskStatistics.css';

function TaskStatistics({ tasks }) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      pending,
      completionRate
    };
  }, [tasks]);

  return (
    <div className="statistics-container">
      <h2>Task Statistics</h2>
      <div className="stats-grid">
        <div className="stat-card total">
          <h3>Total Tasks</h3>
          <p className="stat-number">{stats.total}</p>
        </div>
        <div className="stat-card completed">
          <h3>Completed</h3>
          <p className="stat-number">{stats.completed}</p>
        </div>
        <div className="stat-card pending">
          <h3>Pending</h3>
          <p className="stat-number">{stats.pending}</p>
        </div>
        <div className="stat-card completion-rate">
          <h3>Completion Rate</h3>
          <div className="progress-container">
            <div 
              className="progress-bar" 
              style={{ width: `${stats.completionRate}%` }}
            />
            <p className="progress-text">{stats.completionRate}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskStatistics; 