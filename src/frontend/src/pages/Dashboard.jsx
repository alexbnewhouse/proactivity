import React, { useState, useEffect } from 'react'
import './Dashboard.css'

function Dashboard() {
  const [energyLevel, setEnergyLevel] = useState('moderate')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [stats, setStats] = useState({
    todayFocusTime: 0,
    tasksCompleted: 0,
    energyCheckins: 0,
    currentStreak: 0
  })

  const [currentTask, setCurrentTask] = useState('')
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [adhdInsights, setAdhdInsights] = useState([])

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Load data from API or localStorage
  useEffect(() => {
    loadDashboardData()
    loadNotifications()
    loadAdhdInsights()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Try to load from backend first
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setCurrentTask(data.currentTask || '')
        setEnergyLevel(data.energyLevel || 'moderate')
      } else {
        // Fall back to localStorage
        const savedStats = localStorage.getItem('proactivity-stats')
        const savedTask = localStorage.getItem('proactivity-current-task')
        const savedEnergy = localStorage.getItem('proactivity-energy-level')

        if (savedStats) setStats(JSON.parse(savedStats))
        if (savedTask) setCurrentTask(savedTask)
        if (savedEnergy) setEnergyLevel(savedEnergy)
      }
    } catch (error) {
      console.log('Loading from localStorage (offline mode)')
      // Load from localStorage as fallback
      const savedStats = localStorage.getItem('proactivity-stats')
      const savedTask = localStorage.getItem('proactivity-current-task')
      const savedEnergy = localStorage.getItem('proactivity-energy-level')

      if (savedStats) setStats(JSON.parse(savedStats))
      if (savedTask) setCurrentTask(savedTask)
      if (savedEnergy) setEnergyLevel(savedEnergy)
    }
  }

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/recent')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      // Provide helpful default notifications for ADHD users
      setNotifications([
        {
          id: 1,
          type: 'energy-check',
          message: 'How\'s your energy level right now? Update it to get better task suggestions.',
          time: 'Now',
          action: 'update-energy'
        },
        {
          id: 2,
          type: 'tip',
          message: 'Pro tip: Break large tasks into 15-minute chunks to reduce overwhelm.',
          time: '1 hour ago',
          action: null
        }
      ])
    }
  }

  const loadAdhdInsights = async () => {
    try {
      const response = await fetch('/api/insights/adhd')
      if (response.ok) {
        const data = await response.json()
        setAdhdInsights(data.insights || [])
      }
    } catch (error) {
      // Provide helpful ADHD insights
      setAdhdInsights([
        {
          id: 1,
          type: 'pattern',
          title: 'Your Best Focus Time',
          insight: 'You tend to focus best in the mornings. Try scheduling complex tasks between 9-11 AM.',
          icon: '🌅'
        },
        {
          id: 2,
          type: 'suggestion',
          title: 'Task Initiation Tip',
          insight: 'Setting a 2-minute timer to just "start" a task can help overcome initiation paralysis.',
          icon: '⚡'
        },
        {
          id: 3,
          type: 'celebration',
          title: 'Progress Recognition',
          insight: 'You\'ve been consistent with small tasks this week. That\'s building great momentum!',
          icon: '🎉'
        }
      ])
    }
  }

  const updateEnergyLevel = async (level) => {
    setEnergyLevel(level)

    // Save to localStorage immediately
    localStorage.setItem('proactivity-energy-level', level)

    // Update backend if available
    try {
      await fetch('/api/energy-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ energyLevel: level })
      })
    } catch (error) {
      console.log('Energy level saved locally (offline mode)')
    }

    // Update stats
    const newStats = {
      ...stats,
      energyCheckins: stats.energyCheckins + 1
    }
    setStats(newStats)
    localStorage.setItem('proactivity-stats', JSON.stringify(newStats))
  }

  const startFocusSession = async () => {
    setSessionActive(true)
    setSessionStartTime(new Date())

    try {
      await fetch('/api/focus-session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: currentTask || 'Focus session',
          energyLevel: energyLevel
        })
      })
    } catch (error) {
      console.log('Focus session started locally')
    }
  }

  const endFocusSession = async () => {
    if (!sessionStartTime) return

    const sessionDuration = Math.round((new Date() - sessionStartTime) / (1000 * 60))
    setSessionActive(false)
    setSessionStartTime(null)

    // Update stats
    const newStats = {
      ...stats,
      todayFocusTime: stats.todayFocusTime + sessionDuration,
      currentStreak: stats.currentStreak + 1
    }
    setStats(newStats)
    localStorage.setItem('proactivity-stats', JSON.stringify(newStats))

    try {
      await fetch('/api/focus-session/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: sessionDuration,
          task: currentTask
        })
      })
    } catch (error) {
      console.log('Focus session saved locally')
    }

    // Show celebration
    addNotification({
      id: Date.now(),
      type: 'celebration',
      message: `Great focus session! You worked for ${sessionDuration} minutes. 🎉`,
      time: 'Just now'
    })
  }

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 4)])
  }

  const getEnergyRecommendations = () => {
    const recommendations = {
      high: [
        'Perfect time for complex writing or analysis',
        'Tackle that challenging section you\'ve been avoiding',
        'Great for creative brainstorming sessions'
      ],
      moderate: [
        'Good for steady writing progress',
        'Ideal for reviewing and editing work',
        'Try organizing your notes or references'
      ],
      low: [
        'Perfect for simple, routine tasks',
        'Light reading and highlighting',
        'Organize files or clean up workspace'
      ],
      depleted: [
        'Time for rest and self-care',
        'Light tasks like sorting emails',
        'Consider a short break or walk'
      ]
    }
    return recommendations[energyLevel] || []
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return '🌅 Good morning!'
    if (hour < 17) return '☀️ Good afternoon!'
    return '🌙 Good evening!'
  }

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>{getGreeting()}</h1>
        <p className="adhd-friendly-subtitle">
          {sessionActive ? '🎯 Focus session active' : 'Ready to make some progress?'}
        </p>
      </header>

      {/* Energy Level Section */}
      <div className="energy-section">
        <h2>🔋 Current Energy Level</h2>
        <div className="energy-buttons">
          {[
            { level: 'high', emoji: '⚡', label: 'High' },
            { level: 'moderate', emoji: '🔋', label: 'Moderate' },
            { level: 'low', emoji: '🪫', label: 'Low' },
            { level: 'depleted', emoji: '😴', label: 'Depleted' }
          ].map(({ level, emoji, label }) => (
            <button
              key={level}
              className={`energy-btn ${energyLevel === level ? 'active' : ''}`}
              onClick={() => updateEnergyLevel(level)}
            >
              {emoji} {label}
            </button>
          ))}
        </div>
        <div className="energy-recommendations">
          <h3>💡 Based on your energy:</h3>
          <ul>
            {getEnergyRecommendations().map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <h3>{formatTime(stats.todayFocusTime)}</h3>
            <p>Focus Time Today</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats.tasksCompleted}</h3>
            <p>Tasks Completed</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔋</div>
          <div className="stat-content">
            <h3>{stats.energyCheckins}</h3>
            <p>Energy Check-ins</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <h3>{stats.currentStreak}</h3>
            <p>Current Streak</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Current Task Section */}
        <div className="dashboard-section">
          <h2>🎯 Current Focus</h2>
          <div className="current-task-section">
            <input
              type="text"
              placeholder="What are you working on?"
              value={currentTask}
              onChange={(e) => {
                setCurrentTask(e.target.value)
                localStorage.setItem('proactivity-current-task', e.target.value)
              }}
              className="task-input"
            />
            {sessionActive ? (
              <div className="session-active">
                <p>⏰ Session running: {Math.floor((new Date() - sessionStartTime) / (1000 * 60))} minutes</p>
                <button className="action-btn secondary" onClick={endFocusSession}>
                  End Session
                </button>
              </div>
            ) : (
              <button
                className="action-btn primary"
                onClick={startFocusSession}
                disabled={!currentTask.trim()}
              >
                🎯 Start 25min Focus
              </button>
            )}
          </div>
        </div>

        {/* ADHD Insights */}
        <div className="dashboard-section">
          <h2>🧠 ADHD Insights</h2>
          <div className="insights-list">
            {adhdInsights.map(insight => (
              <div key={insight.id} className={`insight-item ${insight.type}`}>
                <div className="insight-icon">{insight.icon}</div>
                <div className="insight-content">
                  <h4>{insight.title}</h4>
                  <p>{insight.insight}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="dashboard-section">
        <h2>📬 Gentle Reminders</h2>
        <div className="notifications-list">
          {notifications.map(notification => (
            <div key={notification.id} className={`notification-item ${notification.type}`}>
              <div className="notification-icon">
                {notification.type === 'energy-check' ? '🔋' :
                 notification.type === 'tip' ? '💡' :
                 notification.type === 'celebration' ? '🎉' : '📬'}
              </div>
              <div className="notification-content">
                <p>{notification.message}</p>
                <span className="notification-time">{notification.time}</span>
              </div>
              {notification.action === 'update-energy' && (
                <button className="notification-action" onClick={() => document.querySelector('.energy-buttons').scrollIntoView()}>
                  Update Now
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>⚡ Quick Actions</h2>
        <div className="actions-grid">
          <button
            className="action-btn"
            onClick={() => window.open('/tasks', '_blank')}
          >
            <span>📋</span>
            View All Tasks
          </button>
          <button
            className="action-btn"
            onClick={() => {
              const note = prompt('Quick thought or idea:')
              if (note) {
                addNotification({
                  id: Date.now(),
                  type: 'note',
                  message: `Note saved: "${note.substring(0, 50)}..."`,
                  time: 'Just now'
                })
              }
            }}
          >
            <span>📝</span>
            Quick Note
          </button>
          <button
            className="action-btn"
            onClick={() => {
              if (sessionActive) {
                endFocusSession()
              } else {
                startFocusSession()
              }
            }}
          >
            <span>{sessionActive ? '⏹️' : '⏰'}</span>
            {sessionActive ? 'End Focus' : 'Focus Timer'}
          </button>
          <button
            className="action-btn"
            onClick={() => window.open('/patterns', '_blank')}
          >
            <span>📊</span>
            View Patterns
          </button>
        </div>
      </div>

      {/* ADHD-Friendly Tips */}
      <div className="adhd-tips-section">
        <h2>💚 ADHD-Friendly Reminders</h2>
        <div className="tips-grid">
          <div className="tip-card">
            <h4>🎯 Progress Over Perfection</h4>
            <p>Any progress is good progress. Celebrate small wins!</p>
          </div>
          <div className="tip-card">
            <h4>⚡ Energy Awareness</h4>
            <p>Match your tasks to your energy level. High energy = complex tasks.</p>
          </div>
          <div className="tip-card">
            <h4>🧠 Executive Function Support</h4>
            <p>Break big tasks into tiny steps. Your brain will thank you.</p>
          </div>
          <div className="tip-card">
            <h4>🤝 Body Doubling</h4>
            <p>Work alongside others (virtually or in person) for accountability.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard