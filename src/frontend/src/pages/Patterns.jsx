import React, { useState, useEffect } from 'react'
import './Patterns.css'

function Patterns() {
  const [patterns, setPatterns] = useState([])
  const [insights, setInsights] = useState([])
  const [activeTab, setActiveTab] = useState('productivity')

  useEffect(() => {
    // Mock data - will be replaced with API calls
    setPatterns([
      {
        id: 1,
        type: 'productivity',
        title: 'Morning Peak Performance',
        description: 'You are most productive between 9:00 AM and 11:30 AM',
        confidence: 87,
        discovered: '2024-01-10',
        recommendations: [
          'Schedule your most important writing tasks for morning hours',
          'Block calendar during peak hours to minimize interruptions',
          'Use this time for deep work on your dissertation'
        ]
      },
      {
        id: 2,
        type: 'distraction',
        title: 'Social Media Interruptions',
        description: 'Social media usage peaks around 2:00 PM, disrupting afternoon focus',
        confidence: 73,
        discovered: '2024-01-12',
        recommendations: [
          'Use website blockers during afternoon work sessions',
          'Schedule designated social media breaks',
          'Consider moving less demanding tasks to early afternoon'
        ]
      },
      {
        id: 3,
        type: 'energy',
        title: 'Post-Lunch Energy Dip',
        description: 'Energy levels drop significantly between 1:00 PM and 3:00 PM',
        confidence: 91,
        discovered: '2024-01-08',
        recommendations: [
          'Take a 20-minute walk after lunch',
          'Schedule lighter tasks during this period',
          'Consider a brief meditation or breathing exercise'
        ]
      }
    ])

    setInsights([
      {
        id: 1,
        type: 'trend',
        title: 'Improving Focus Duration',
        description: 'Your average focus session has increased from 25 to 35 minutes over the past week',
        impact: 'positive'
      },
      {
        id: 2,
        type: 'warning',
        title: 'Skipping Breaks',
        description: 'You\'ve missed 60% of scheduled breaks this week, which may lead to burnout',
        impact: 'negative'
      },
      {
        id: 3,
        type: 'suggestion',
        title: 'Task Breakdown Success',
        description: 'Tasks broken into 15-minute chunks have a 85% completion rate vs 45% for longer tasks',
        impact: 'insight'
      }
    ])
  }, [])

  const getPatternIcon = (type) => {
    switch (type) {
      case 'productivity': return '📈'
      case 'distraction': return '📱'
      case 'energy': return '⚡'
      case 'focus': return '🎯'
      default: return '🧠'
    }
  }

  const getInsightIcon = (type) => {
    switch (type) {
      case 'trend': return '📊'
      case 'warning': return '⚠️'
      case 'suggestion': return '💡'
      default: return 'ℹ️'
    }
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return '#28a745'
    if (confidence >= 60) return '#ffc107'
    return '#dc3545'
  }

  const filteredPatterns = patterns.filter(pattern => {
    if (activeTab === 'all') return true
    return pattern.type === activeTab
  })

  return (
    <div className="patterns-page">
      <header className="patterns-header">
        <h1>ADHD Patterns & Insights 🧠</h1>
        <p>Discover your productivity patterns and receive personalized recommendations</p>
      </header>

      <div className="insights-section">
        <h2>Recent Insights</h2>
        <div className="insights-grid">
          {insights.map(insight => (
            <div key={insight.id} className={`insight-card ${insight.impact}`}>
              <div className="insight-icon">
                {getInsightIcon(insight.type)}
              </div>
              <div className="insight-content">
                <h4>{insight.title}</h4>
                <p>{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="patterns-section">
        <div className="patterns-header-controls">
          <h2>Discovered Patterns</h2>
          <div className="pattern-tabs">
            <button
              className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
            <button
              className={`tab-btn ${activeTab === 'productivity' ? 'active' : ''}`}
              onClick={() => setActiveTab('productivity')}
            >
              Productivity
            </button>
            <button
              className={`tab-btn ${activeTab === 'distraction' ? 'active' : ''}`}
              onClick={() => setActiveTab('distraction')}
            >
              Distractions
            </button>
            <button
              className={`tab-btn ${activeTab === 'energy' ? 'active' : ''}`}
              onClick={() => setActiveTab('energy')}
            >
              Energy
            </button>
            <button
              className={`tab-btn ${activeTab === 'focus' ? 'active' : ''}`}
              onClick={() => setActiveTab('focus')}
            >
              Focus
            </button>
          </div>
        </div>

        <div className="patterns-list">
          {filteredPatterns.map(pattern => (
            <div key={pattern.id} className="pattern-card">
              <div className="pattern-header">
                <div className="pattern-icon">
                  {getPatternIcon(pattern.type)}
                </div>
                <div className="pattern-title">
                  <h3>{pattern.title}</h3>
                  <div className="pattern-meta">
                    <span className="pattern-type">{pattern.type}</span>
                    <span className="pattern-date">Discovered: {pattern.discovered}</span>
                  </div>
                </div>
                <div className="confidence-score">
                  <div
                    className="confidence-circle"
                    style={{ borderColor: getConfidenceColor(pattern.confidence) }}
                  >
                    <span style={{ color: getConfidenceColor(pattern.confidence) }}>
                      {pattern.confidence}%
                    </span>
                  </div>
                  <small>Confidence</small>
                </div>
              </div>

              <p className="pattern-description">{pattern.description}</p>

              <div className="recommendations">
                <h4>💡 Recommendations</h4>
                <ul>
                  {pattern.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>

              <div className="pattern-actions">
                <button className="btn btn-primary">Apply Recommendations</button>
                <button className="btn btn-secondary">Track Progress</button>
              </div>
            </div>
          ))}
        </div>

        {filteredPatterns.length === 0 && (
          <div className="empty-state">
            <h3>No patterns found</h3>
            <p>
              {activeTab === 'all'
                ? "We're still learning about your patterns. Keep using the app to discover insights!"
                : `No ${activeTab} patterns discovered yet. Try using the app for a few more days.`
              }
            </p>
          </div>
        )}
      </div>

      <div className="pattern-stats">
        <h2>Pattern Analytics</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-number">{patterns.length}</span>
            <span className="stat-label">Total Patterns</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {Math.round(patterns.reduce((acc, p) => acc + p.confidence, 0) / patterns.length)}%
            </span>
            <span className="stat-label">Avg Confidence</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {patterns.filter(p => p.confidence >= 80).length}
            </span>
            <span className="stat-label">High Confidence</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">7</span>
            <span className="stat-label">Days Tracked</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Patterns