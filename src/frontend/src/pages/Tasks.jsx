import React, { useState, useEffect } from 'react'
import './Tasks.css'

function Tasks() {
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState('all')
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: ''
  })
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    // Mock data - will be replaced with API calls
    setTasks([
      {
        id: 1,
        title: 'Review literature on ADHD executive function',
        description: 'Comprehensive review of recent papers on executive function deficits in ADHD',
        priority: 'high',
        status: 'completed',
        dueDate: '2024-01-15',
        createdAt: '2024-01-10'
      },
      {
        id: 2,
        title: 'Write methodology section draft',
        description: 'First draft of methodology section for dissertation',
        priority: 'high',
        status: 'in_progress',
        dueDate: '2024-01-20',
        createdAt: '2024-01-12'
      },
      {
        id: 3,
        title: 'Organize research notes in Obsidian',
        description: 'Clean up and organize all research notes using proper tagging',
        priority: 'medium',
        status: 'pending',
        dueDate: '2024-01-25',
        createdAt: '2024-01-13'
      }
    ])
  }, [])

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true
    return task.status === filter
  })

  const handleAddTask = (e) => {
    e.preventDefault()
    const task = {
      id: Date.now(),
      ...newTask,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0]
    }
    setTasks([...tasks, task])
    setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' })
    setShowAddForm(false)
  }

  const toggleTaskStatus = (taskId) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const statusOrder = ['pending', 'in_progress', 'completed']
        const currentIndex = statusOrder.indexOf(task.status)
        const nextIndex = (currentIndex + 1) % statusOrder.length
        return { ...task, status: statusOrder[nextIndex] }
      }
      return task
    }))
  }

  const deleteTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId))
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅'
      case 'in_progress': return '🔄'
      default: return '⏳'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#d63384'
      case 'medium': return '#856404'
      case 'low': return '#0c5460'
      default: return '#666'
    }
  }

  return (
    <div className="tasks-page">
      <header className="tasks-header">
        <h1>Tasks Management 📋</h1>
        <p>Organize your research and writing tasks effectively</p>
      </header>

      <div className="tasks-controls">
        <div className="task-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({tasks.length})
          </button>
          <button
            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending ({tasks.filter(t => t.status === 'pending').length})
          </button>
          <button
            className={`filter-btn ${filter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setFilter('in_progress')}
          >
            In Progress ({tasks.filter(t => t.status === 'in_progress').length})
          </button>
          <button
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed ({tasks.filter(t => t.status === 'completed').length})
          </button>
        </div>

        <button
          className="add-task-btn"
          onClick={() => setShowAddForm(true)}
        >
          ➕ Add Task
        </button>
      </div>

      {showAddForm && (
        <div className="add-task-form card">
          <h3>Add New Task</h3>
          <form onSubmit={handleAddTask}>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                rows="3"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Add Task</button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="tasks-list">
        {filteredTasks.map(task => (
          <div key={task.id} className={`task-card ${task.status}`}>
            <div className="task-header">
              <div className="task-status-icon" onClick={() => toggleTaskStatus(task.id)}>
                {getStatusIcon(task.status)}
              </div>
              <h3>{task.title}</h3>
              <div className="task-actions">
                <span
                  className="priority-badge"
                  style={{ backgroundColor: getPriorityColor(task.priority) }}
                >
                  {task.priority}
                </span>
                <button
                  className="delete-btn"
                  onClick={() => deleteTask(task.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
            <p className="task-description">{task.description}</p>
            <div className="task-meta">
              {task.dueDate && (
                <span className="due-date">📅 Due: {task.dueDate}</span>
              )}
              <span className="created-date">Created: {task.createdAt}</span>
            </div>
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="empty-state">
          <h3>No tasks found</h3>
          <p>
            {filter === 'all'
              ? "You don't have any tasks yet. Create your first task to get started!"
              : `No ${filter.replace('_', ' ')} tasks found.`
            }
          </p>
        </div>
      )}
    </div>
  )
}

export default Tasks