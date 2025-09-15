import React, { useState, useEffect } from 'react'
import './Settings.css'

function Settings() {
  const [settings, setSettings] = useState({
    notifications: {
      emailEnabled: true,
      pushEnabled: true,
      breakReminders: true,
      progressUpdates: false,
      frequencyMinutes: 30
    },
    privacy: {
      dataCollection: true,
      analyticsOptIn: false,
      shareAnonymousData: true
    },
    preferences: {
      theme: 'light',
      language: 'en',
      timezone: 'UTC-5',
      workingHours: {
        start: '09:00',
        end: '17:00'
      }
    },
    adhd: {
      severityLevel: 'moderate',
      primarySymptoms: ['inattention', 'hyperactivity'],
      copingStrategies: ['time-blocking', 'pomodoro', 'task-breakdown'],
      medicationReminders: false
    },
    obsidian: {
      connected: false,
      vaultPath: '',
      syncEnabled: false,
      autoTagging: true
    }
  })

  const [activeSection, setActiveSection] = useState('notifications')
  const [hasChanges, setHasChanges] = useState(false)

  const updateSetting = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
    setHasChanges(true)
  }

  const updateNestedSetting = (section, parentKey, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [parentKey]: {
          ...prev[section][parentKey],
          [key]: value
        }
      }
    }))
    setHasChanges(true)
  }

  const handleArrayToggle = (section, key, value) => {
    const currentArray = settings[section][key]
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value]

    updateSetting(section, key, newArray)
  }

  const saveSettings = () => {
    // This will be replaced with actual API call
    console.log('Saving settings:', settings)
    setHasChanges(false)
    alert('Settings saved successfully!')
  }

  const resetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      // Reset to default values
      setHasChanges(false)
    }
  }

  const sections = [
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'adhd', label: 'ADHD Profile', icon: '🧠' },
    { id: 'obsidian', label: 'Obsidian', icon: '📝' }
  ]

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1>Settings ⚙️</h1>
        <p>Customize your Proactivity experience</p>
      </header>

      <div className="settings-layout">
        <nav className="settings-nav">
          {sections.map(section => (
            <button
              key={section.id}
              className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              <span className="nav-icon">{section.icon}</span>
              {section.label}
            </button>
          ))}
        </nav>

        <div className="settings-content">
          {activeSection === 'notifications' && (
            <div className="settings-section">
              <h2>Notification Settings</h2>

              <div className="setting-group">
                <h3>Notification Types</h3>
                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.notifications.emailEnabled}
                      onChange={(e) => updateSetting('notifications', 'emailEnabled', e.target.checked)}
                    />
                    Email Notifications
                  </label>
                  <p>Receive important updates via email</p>
                </div>

                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.notifications.pushEnabled}
                      onChange={(e) => updateSetting('notifications', 'pushEnabled', e.target.checked)}
                    />
                    Push Notifications
                  </label>
                  <p>Get real-time notifications in your browser</p>
                </div>

                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.notifications.breakReminders}
                      onChange={(e) => updateSetting('notifications', 'breakReminders', e.target.checked)}
                    />
                    Break Reminders
                  </label>
                  <p>Remind me to take regular breaks</p>
                </div>

                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.notifications.progressUpdates}
                      onChange={(e) => updateSetting('notifications', 'progressUpdates', e.target.checked)}
                    />
                    Progress Updates
                  </label>
                  <p>Daily and weekly progress summaries</p>
                </div>
              </div>

              <div className="setting-group">
                <h3>Reminder Frequency</h3>
                <div className="setting-item">
                  <label>Break reminder interval (minutes)</label>
                  <select
                    value={settings.notifications.frequencyMinutes}
                    onChange={(e) => updateSetting('notifications', 'frequencyMinutes', parseInt(e.target.value))}
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="settings-section">
              <h2>Privacy Settings</h2>

              <div className="setting-group">
                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.privacy.dataCollection}
                      onChange={(e) => updateSetting('privacy', 'dataCollection', e.target.checked)}
                    />
                    Allow Data Collection
                  </label>
                  <p>Help improve the app by sharing usage data</p>
                </div>

                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.privacy.analyticsOptIn}
                      onChange={(e) => updateSetting('privacy', 'analyticsOptIn', e.target.checked)}
                    />
                    Analytics Opt-in
                  </label>
                  <p>Share anonymous analytics to help us understand user behavior</p>
                </div>

                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.privacy.shareAnonymousData}
                      onChange={(e) => updateSetting('privacy', 'shareAnonymousData', e.target.checked)}
                    />
                    Share Anonymous Data
                  </label>
                  <p>Contribute to ADHD research with anonymized data</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'preferences' && (
            <div className="settings-section">
              <h2>General Preferences</h2>

              <div className="setting-group">
                <div className="setting-item">
                  <label>Theme</label>
                  <select
                    value={settings.preferences.theme}
                    onChange={(e) => updateSetting('preferences', 'theme', e.target.value)}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>

                <div className="setting-item">
                  <label>Language</label>
                  <select
                    value={settings.preferences.language}
                    onChange={(e) => updateSetting('preferences', 'language', e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                </div>

                <div className="setting-item">
                  <label>Timezone</label>
                  <select
                    value={settings.preferences.timezone}
                    onChange={(e) => updateSetting('preferences', 'timezone', e.target.value)}
                  >
                    <option value="UTC-8">Pacific Time</option>
                    <option value="UTC-7">Mountain Time</option>
                    <option value="UTC-6">Central Time</option>
                    <option value="UTC-5">Eastern Time</option>
                  </select>
                </div>
              </div>

              <div className="setting-group">
                <h3>Working Hours</h3>
                <div className="time-inputs">
                  <div className="setting-item">
                    <label>Start Time</label>
                    <input
                      type="time"
                      value={settings.preferences.workingHours.start}
                      onChange={(e) => updateNestedSetting('preferences', 'workingHours', 'start', e.target.value)}
                    />
                  </div>
                  <div className="setting-item">
                    <label>End Time</label>
                    <input
                      type="time"
                      value={settings.preferences.workingHours.end}
                      onChange={(e) => updateNestedSetting('preferences', 'workingHours', 'end', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'adhd' && (
            <div className="settings-section">
              <h2>ADHD Profile</h2>

              <div className="setting-group">
                <div className="setting-item">
                  <label>ADHD Severity Level</label>
                  <select
                    value={settings.adhd.severityLevel}
                    onChange={(e) => updateSetting('adhd', 'severityLevel', e.target.value)}
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
              </div>

              <div className="setting-group">
                <h3>Primary Symptoms</h3>
                {['inattention', 'hyperactivity', 'impulsivity', 'executive-dysfunction'].map(symptom => (
                  <div key={symptom} className="setting-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={settings.adhd.primarySymptoms.includes(symptom)}
                        onChange={() => handleArrayToggle('adhd', 'primarySymptoms', symptom)}
                      />
                      {symptom.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                  </div>
                ))}
              </div>

              <div className="setting-group">
                <h3>Preferred Coping Strategies</h3>
                {['time-blocking', 'pomodoro', 'task-breakdown', 'body-doubling', 'music-focus'].map(strategy => (
                  <div key={strategy} className="setting-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={settings.adhd.copingStrategies.includes(strategy)}
                        onChange={() => handleArrayToggle('adhd', 'copingStrategies', strategy)}
                      />
                      {strategy.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                  </div>
                ))}
              </div>

              <div className="setting-group">
                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.adhd.medicationReminders}
                      onChange={(e) => updateSetting('adhd', 'medicationReminders', e.target.checked)}
                    />
                    Medication Reminders
                  </label>
                  <p>Remind me to take my ADHD medication</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'obsidian' && (
            <div className="settings-section">
              <h2>Obsidian Integration</h2>

              <div className="setting-group">
                <div className="connection-status">
                  <span className={`status-indicator ${settings.obsidian.connected ? 'connected' : 'disconnected'}`}>
                    {settings.obsidian.connected ? '🟢 Connected' : '🔴 Disconnected'}
                  </span>
                  <button className="btn btn-primary">
                    {settings.obsidian.connected ? 'Disconnect' : 'Connect to Obsidian'}
                  </button>
                </div>
              </div>

              <div className="setting-group">
                <div className="setting-item">
                  <label>Vault Path</label>
                  <input
                    type="text"
                    value={settings.obsidian.vaultPath}
                    onChange={(e) => updateSetting('obsidian', 'vaultPath', e.target.value)}
                    placeholder="/path/to/your/obsidian/vault"
                  />
                </div>

                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.obsidian.syncEnabled}
                      onChange={(e) => updateSetting('obsidian', 'syncEnabled', e.target.checked)}
                    />
                    Enable Sync
                  </label>
                  <p>Automatically sync tasks and notes with Obsidian</p>
                </div>

                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.obsidian.autoTagging}
                      onChange={(e) => updateSetting('obsidian', 'autoTagging', e.target.checked)}
                    />
                    Auto-tagging
                  </label>
                  <p>Automatically add ADHD-related tags to notes</p>
                </div>
              </div>
            </div>
          )}

          <div className="settings-actions">
            <button
              className="btn btn-primary"
              onClick={saveSettings}
              disabled={!hasChanges}
            >
              Save Changes
            </button>
            <button
              className="btn btn-secondary"
              onClick={resetSettings}
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings