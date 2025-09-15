import React, { useState, useEffect } from 'react'
import './Dashboard.css'

function Dashboard() {
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    activePatterns: 0,
    todayProgress: 0
  })

  const [recentTasks, setRecentTasks] = useState([])
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    // This will be replaced with actual API calls
    setStats({
      totalTasks: 12,
      completedTasks: 8,
      activePatterns: 3,
      todayProgress: 67
    })

    setRecentTasks([
      { id: 1, title: 'Review literature on ADHD executive function', status: 'completed', priority: 'high' },
      { id: 2, title: 'Write methodology section draft', status: 'in_progress', priority: 'high' },
      { id: 3, title: 'Organize research notes in Obsidian', status: 'pending', priority: 'medium' }
    ])

    setNotifications([
      { id: 1, type: 'reminder', message: 'Time for a 15-minute break!', time: '2 min ago' },
      { id: 2, type: 'insight', message: 'Your productivity peak is between 10-12 AM', time: '1 hour ago' }
    ])
  }, [])

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Welcome back! 👋</h1>
        <p>Here's your progress today</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>{stats.totalTasks}</h3>
            <p>Total Tasks</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats.completedTasks}</h3>
            <p>Completed</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🧠</div>
          <div className="stat-content">
            <h3>{stats.activePatterns}</h3>
            <p>Active Patterns</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>{stats.todayProgress}%</h3>
            <p>Today's Progress</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h2>Recent Tasks</h2>
          <div className="tasks-list">
            {recentTasks.map(task => (
              <div key={task.id} className={`task-item ${task.status}`}>
                <div className="task-status">
                  {task.status === 'completed' ? '✅' :
                   task.status === 'in_progress' ? '🔄' : '⏳'}
                </div>
                <div className="task-content">
                  <h4>{task.title}</h4>
                  <span className={`priority ${task.priority}`}>{task.priority}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Notifications</h2>
          <div className="notifications-list">
            {notifications.map(notification => (
              <div key={notification.id} className={`notification-item ${notification.type}`}>
                <div className="notification-icon">
                  {notification.type === 'reminder' ? '⏰' : '💡'}
                </div>
                <div className="notification-content">
                  <p>{notification.message}</p>
                  <span className="notification-time">{notification.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <button className="action-btn">
            <span>➕</span>
            Add New Task
          </button>
          <button className="action-btn">
            <span>📝</span>
            Quick Note
          </button>
          <button className="action-btn">
            <span>⏰</span>
            Set Timer
          </button>
          <button className="action-btn">
            <span>🎯</span>
            Focus Mode
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard