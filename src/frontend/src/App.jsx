import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Patterns from './pages/Patterns'
import Settings from './pages/Settings'
import MorningPlanning from './components/MorningPlanning'

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/morning-planning" element={
            <MorningPlanning
              onComplete={(planData) => {
                console.log('Morning planning completed:', planData);
                window.location.href = '/';
              }}
              onBypass={(reason, elapsedTime) => {
                console.log('Emergency bypass requested:', reason, elapsedTime);
                // Handle bypass logic
              }}
              onEscalate={(reason, data) => {
                console.log('Spectrum escalation:', reason, data);
                // Handle escalation logic
              }}
            />
          } />
          <Route path="/*" element={
            <div>
              <Navigation />
              <main className="container">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/patterns" element={<Patterns />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </main>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  )
}

export default App