// blocked.js - JavaScript for the blocked page

// Get blocked URL from query parameter
const urlParams = new URLSearchParams(window.location.search);
const blockedUrl = urlParams.get('url');
if (blockedUrl) {
  document.getElementById('blockedUrl').textContent = `Blocked: ${decodeURIComponent(blockedUrl)}`;
}

// Load stats
async function loadStats() {
  try {
    const data = await chrome.storage.local.get(['tasks', 'dailyStats', 'streakData']);
    const today = new Date().toDateString();
    
    // Calculate completed tasks today
    const tasks = data.tasks || [];
    const completedToday = tasks.filter(task => {
      if (!task.completed || !task.completedAt) return false;
      const completedDate = new Date(task.completedAt).toDateString();
      return completedDate === today;
    }).length;
    
    // Get daily stats
    const dailyStats = data.dailyStats || {};
    const todayStats = dailyStats[today] || { focusTime: 0 };
    
    // Calculate streak
    const streakData = data.streakData || {};
    let streak = 0;
    let currentDate = new Date();
    while (true) {
      const dateStr = currentDate.toDateString();
      if (streakData[dateStr] && streakData[dateStr].completed > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    // Update UI
    document.getElementById('tasksCompleted').textContent = completedToday;
    document.getElementById('focusTime').textContent = `${todayStats.focusTime || 0}m`;
    document.getElementById('streakDays').textContent = streak;
    
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  // View Tasks button
  document.getElementById('viewTasksBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  });

  // Quick Add Task button
  document.getElementById('quickAddTaskBtn').addEventListener('click', async () => {
    const taskTitle = prompt('What task would you like to add?');
    if (taskTitle && taskTitle.trim()) {
      try {
        const data = await chrome.storage.local.get(['tasks']);
        const tasks = data.tasks || [];
        
        const newTask = {
          id: Date.now().toString(),
          title: taskTitle.trim(),
          priority: 'medium',
          completed: false,
          createdAt: new Date().toISOString(),
          energyLevel: 3,
          estimatedMinutes: 30
        };
        
        tasks.unshift(newTask);
        await chrome.storage.local.set({ tasks });
        
        alert('Task added! Now complete it to unlock web browsing.');
        
        // Refresh stats
        loadStats();
        
      } catch (error) {
        console.error('Error adding task:', error);
        alert('Error adding task. Please try again.');
      }
    }
  });

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Load stats on page load
  loadStats();
});

// Refresh stats every 10 seconds
setInterval(loadStats, 10000);

// Check if task was completed to automatically redirect
setInterval(async () => {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getSessionData' });
    if (response && !response.enforcementActive && response.hasCompletedDailyTodo) {
      // Enforcement disabled, redirect back to original URL
      if (blockedUrl) {
        window.location.href = decodeURIComponent(blockedUrl);
      }
    }
  } catch (error) {
    console.log('Error checking enforcement status:', error);
  }
}, 5000);