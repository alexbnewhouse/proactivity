import React, { useState, useEffect } from 'react'
import './MorningPlanning.css'

function MorningPlanning({ spectrumLevel = 1, onComplete, onBypass, onEscalate }) {
  const [dailyGoal, setDailyGoal] = useState('')
  const [energyLevel, setEnergyLevel] = useState('moderate')
  const [availableTime, setAvailableTime] = useState(480) // 8 hours in minutes
  const [tasks, setTasks] = useState([])
  const [currentTask, setCurrentTask] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [timeEstimate, setTimeEstimate] = useState(25)
  const [category, setCategory] = useState('general')
  const [priority, setPriority] = useState('medium')
  const [showBypassDialog, setShowBypassDialog] = useState(false)
  const [bypassReason, setBypassReason] = useState('')
  const [startTime] = useState(new Date())
  const [elapsedMinutes, setElapsedMinutes] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((new Date() - startTime) / (1000 * 60))
      setElapsedMinutes(elapsed)

      // Auto-escalate based on time spent
      if (elapsed >= 30 && spectrumLevel < 3) {
        onEscalate?.('time_elapsed', elapsed)
      } else if (elapsed >= 60 && spectrumLevel < 5) {
        onEscalate?.('prolonged_delay', elapsed)
      } else if (elapsed >= 120 && spectrumLevel < 8) {
        onEscalate?.('serious_procrastination', elapsed)
      }
    }, 60000)

    return () => clearInterval(timer)
  }, [spectrumLevel, onEscalate, startTime])

  const addTask = () => {
    if (!currentTask.trim()) return

    const newTask = {
      id: Date.now(),
      title: currentTask,
      description: taskDescription,
      estimatedMinutes: timeEstimate,
      category,
      priority,
      energyRequired: energyLevel,
      completed: false,
      breakdown: [],
      createdAt: new Date().toISOString()
    }

    setTasks([...tasks, newTask])
    setCurrentTask('')
    setTaskDescription('')
    setTimeEstimate(25)
    setCategory('general')
    setPriority('medium')
  }

  const removeTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId))
  }

  const breakdownTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    try {
      const response = await fetch('/api/tasks/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: task.title,
          description: task.description,
          energyLevel: energyLevel,
          availableTime: task.estimatedMinutes,
          context: dailyGoal
        })
      })

      if (response.ok) {
        const breakdown = await response.json()
        setTasks(tasks.map(t =>
          t.id === taskId ? { ...t, breakdown: breakdown.subtasks || [] } : t
        ))
      }
    } catch (error) {
      console.error('Task breakdown failed:', error)
    }
  }

  const completePlanning = async () => {
    const planData = {
      dailyGoal,
      energyLevel,
      availableTimeMinutes: availableTime,
      tasks: tasks.map(task => ({
        ...task,
        aiGenerated: task.breakdown.length > 0
      })),
      planningDurationMinutes: elapsedMinutes,
      planDate: new Date().toISOString().split('T')[0]
    }

    try {
      const response = await fetch('/api/daily-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData)
      })

      if (response.ok) {
        onComplete?.(planData)
      } else {
        throw new Error('Failed to save plan')
      }
    } catch (error) {
      console.error('Failed to save daily plan:', error)
      // Still complete locally
      onComplete?.(planData)
    }
  }

  const requestBypass = () => {
    if (spectrumLevel >= 8) {
      setShowBypassDialog(true)
    } else {
      // Lower levels don't get bypass option
      alert('Planning is required to start your day productively. Let\'s create a simple plan together!')
    }
  }

  const submitBypass = () => {
    if (bypassReason.trim()) {
      onBypass?.(bypassReason, elapsedMinutes)
      setShowBypassDialog(false)
    }
  }

  const getIntensityMessage = () => {
    const messages = {
      1: '🌅 Good morning! Let\'s plan your day for maximum productivity.',
      2: '🎯 Planning your day helps reduce overwhelm and increases focus.',
      3: '⚠️ You\'ve been here for a while. A quick plan will get you unstuck faster.',
      4: '🚨 Planning is essential for ADHD productivity. Let\'s do this together.',
      5: '⛔ Procrastination detected. Planning is required before accessing other apps.',
      6: '🔒 Your computer is in focus mode. Complete planning to unlock full access.',
      7: '🚫 SERIOUS: Your productivity depends on this. Plan now or remain restricted.',
      8: '💀 CRITICAL: Extended delay detected. Complete planning immediately.',
      9: '🔥 EMERGENCY: This is affecting your entire day. PLAN NOW.',
      10: '☠️ ULTIMATE: Computer hijacked until planning complete. No exceptions.'
    }
    return messages[spectrumLevel] || messages[1]
  }

  const isValidPlan = () => {
    return dailyGoal.trim() && tasks.length >= 1 && tasks.some(task => task.title.trim())
  }

  const totalPlannedTime = tasks.reduce((total, task) => total + task.estimatedMinutes, 0)

  return (
    <div className={`morning-planning spectrum-level-${spectrumLevel}`}>
      <div className="planning-header">
        <h1>🌅 Morning Planning{spectrumLevel >= 5 ? ' - REQUIRED' : ''}</h1>
        <div className="intensity-message">{getIntensityMessage()}</div>

        {elapsedMinutes > 0 && (
          <div className="time-indicator">
            ⏰ Time spent planning: {elapsedMinutes} minutes
            {elapsedMinutes > 30 && <span className="warning"> (Getting long!)</span>}
          </div>
        )}
      </div>

      <div className="planning-container">
        {/* Daily Goal Section */}
        <div className="planning-section">
          <h2>🎯 What's your main goal for today?</h2>
          <textarea
            placeholder="Example: Complete first draft of chapter 3, organize research notes, or make progress on project proposal..."
            value={dailyGoal}
            onChange={(e) => setDailyGoal(e.target.value)}
            className="goal-input"
            rows={3}
          />
        </div>

        {/* Energy & Time Assessment */}
        <div className="planning-section">
          <h2>🔋 Energy & Time Available</h2>
          <div className="assessment-grid">
            <div className="energy-selection">
              <label>Current Energy Level:</label>
              <select value={energyLevel} onChange={(e) => setEnergyLevel(e.target.value)}>
                <option value="high">⚡ High</option>
                <option value="moderate">🔋 Moderate</option>
                <option value="low">🪫 Low</option>
                <option value="depleted">😴 Depleted</option>
              </select>
            </div>
            <div className="time-selection">
              <label>Available Work Time (hours):</label>
              <input
                type="number"
                min="1"
                max="16"
                value={Math.round(availableTime / 60 * 10) / 10}
                onChange={(e) => setAvailableTime(e.target.value * 60)}
              />
            </div>
          </div>
        </div>

        {/* Task Planning Section */}
        <div className="planning-section">
          <h2>📋 Today's Tasks</h2>

          {/* Add Task Form */}
          <div className="add-task-form">
            <div className="task-input-row">
              <input
                type="text"
                placeholder="Task title (e.g., 'Write introduction section')"
                value={currentTask}
                onChange={(e) => setCurrentTask(e.target.value)}
                className="task-title-input"
              />
              <input
                type="number"
                min="5"
                max="180"
                value={timeEstimate}
                onChange={(e) => setTimeEstimate(parseInt(e.target.value))}
                className="time-input"
                placeholder="Minutes"
              />
            </div>

            <textarea
              placeholder="Brief description or context (optional)"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              className="task-description-input"
              rows={2}
            />

            <div className="task-metadata">
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="research">🔍 Research</option>
                <option value="writing">✍️ Writing</option>
                <option value="analysis">📊 Analysis</option>
                <option value="organization">🗂️ Organization</option>
                <option value="administrative">📋 Administrative</option>
                <option value="creative">🎨 Creative</option>
                <option value="revision">📝 Revision</option>
                <option value="general">📌 General</option>
              </select>

              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">🟢 Low Priority</option>
                <option value="medium">🟡 Medium Priority</option>
                <option value="high">🟠 High Priority</option>
                <option value="urgent">🔴 Urgent</option>
              </select>

              <button
                onClick={addTask}
                disabled={!currentTask.trim()}
                className="add-task-btn"
              >
                ➕ Add Task
              </button>
            </div>
          </div>

          {/* Tasks List */}
          <div className="tasks-list">
            {tasks.length === 0 ? (
              <div className="empty-tasks">
                <p>No tasks added yet. Add at least one task to continue.</p>
              </div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className={`task-item priority-${task.priority}`}>
                  <div className="task-header">
                    <h4>{task.title}</h4>
                    <div className="task-actions">
                      <span className="time-estimate">{task.estimatedMinutes}min</span>
                      <button
                        onClick={() => breakdownTask(task.id)}
                        className="breakdown-btn"
                        title="AI Task Breakdown"
                      >
                        🧠 Break Down
                      </button>
                      <button
                        onClick={() => removeTask(task.id)}
                        className="remove-btn"
                      >
                        ❌
                      </button>
                    </div>
                  </div>

                  {task.description && (
                    <p className="task-description">{task.description}</p>
                  )}

                  <div className="task-metadata">
                    <span className="category">{task.category}</span>
                    <span className="energy-req">Energy: {task.energyRequired}</span>
                  </div>

                  {task.breakdown && task.breakdown.length > 0 && (
                    <div className="task-breakdown">
                      <h5>🧠 AI Breakdown:</h5>
                      <ul>
                        {task.breakdown.map((subtask, index) => (
                          <li key={index}>{subtask.title} ({subtask.estimatedMinutes}min)</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {tasks.length > 0 && (
            <div className="planning-summary">
              <h3>📊 Planning Summary</h3>
              <div className="summary-stats">
                <div>Total tasks: {tasks.length}</div>
                <div>Estimated time: {Math.round(totalPlannedTime / 60 * 10) / 10} hours</div>
                <div>Available time: {Math.round(availableTime / 60 * 10) / 10} hours</div>
                <div className={totalPlannedTime > availableTime ? 'warning' : 'good'}>
                  {totalPlannedTime > availableTime ?
                    '⚠️ Over-planned! Consider reducing scope.' :
                    '✅ Realistic planning!'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="planning-actions">
          <button
            onClick={completePlanning}
            disabled={!isValidPlan()}
            className={`complete-btn ${isValidPlan() ? 'ready' : 'disabled'}`}
          >
            ✅ Complete Planning & Start Day
          </button>

          {spectrumLevel >= 8 && (
            <button
              onClick={requestBypass}
              className="bypass-btn"
            >
              🚨 Request Emergency Bypass
            </button>
          )}
        </div>

        {/* Bypass Dialog */}
        {showBypassDialog && (
          <div className="bypass-dialog">
            <div className="dialog-content">
              <h3>⚠️ Emergency Bypass Request</h3>
              <p>Bypassing planning may significantly impact your productivity. Please provide a valid reason:</p>
              <textarea
                value={bypassReason}
                onChange={(e) => setBypassReason(e.target.value)}
                placeholder="Explain why you cannot complete planning right now..."
                rows={4}
              />
              <div className="dialog-actions">
                <button onClick={() => setShowBypassDialog(false)}>Cancel</button>
                <button
                  onClick={submitBypass}
                  disabled={!bypassReason.trim()}
                  className="bypass-confirm"
                >
                  Confirm Bypass
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MorningPlanning