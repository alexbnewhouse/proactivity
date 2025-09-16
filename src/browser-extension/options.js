// Proactivity Options Page JavaScript

// Default settings
const defaultSettings = {
    morningEnforcement: true,
    maxSpectrumLevel: 8,
    workStartTime: '09:00',
    enableNotifications: true,
    notificationFrequency: 'moderate',
    enableTaskBreakdown: true,
    enablePatternDetection: true,
    serverUrl: 'http://localhost:3001'
};

// Initialize options page
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    setupEventListeners();
});

// Load settings from Chrome storage
async function loadSettings() {
    try {
        const settings = await chrome.storage.sync.get(defaultSettings);

        // Populate form fields
        document.getElementById('morningEnforcement').checked = settings.morningEnforcement;
        document.getElementById('maxSpectrumLevel').value = settings.maxSpectrumLevel;
        document.getElementById('spectrumLevelDisplay').textContent = settings.maxSpectrumLevel;
        document.getElementById('workStartTime').value = settings.workStartTime;
        document.getElementById('enableNotifications').checked = settings.enableNotifications;
        document.getElementById('notificationFrequency').value = settings.notificationFrequency;
        document.getElementById('enableTaskBreakdown').checked = settings.enableTaskBreakdown;
        document.getElementById('enablePatternDetection').checked = settings.enablePatternDetection;
        document.getElementById('serverUrl').value = settings.serverUrl;

    } catch (error) {
        console.error('Error loading settings:', error);
        showStatus('saveStatus', 'Error loading settings', 'error');
    }
}

// Save settings to Chrome storage
async function saveSettings() {
    try {
        const settings = {
            morningEnforcement: document.getElementById('morningEnforcement').checked,
            maxSpectrumLevel: parseInt(document.getElementById('maxSpectrumLevel').value),
            workStartTime: document.getElementById('workStartTime').value,
            enableNotifications: document.getElementById('enableNotifications').checked,
            notificationFrequency: document.getElementById('notificationFrequency').value,
            enableTaskBreakdown: document.getElementById('enableTaskBreakdown').checked,
            enablePatternDetection: document.getElementById('enablePatternDetection').checked,
            serverUrl: document.getElementById('serverUrl').value.trim()
        };

        await chrome.storage.sync.set(settings);
        showStatus('saveStatus', 'Settings saved successfully!', 'success');

        // Notify background script of settings change
        chrome.runtime.sendMessage({
            action: 'settingsUpdated',
            settings: settings
        });

    } catch (error) {
        console.error('Error saving settings:', error);
        showStatus('saveStatus', 'Error saving settings', 'error');
    }
}

// Reset settings to defaults
async function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
        try {
            await chrome.storage.sync.set(defaultSettings);
            await loadSettings();
            showStatus('saveStatus', 'Settings reset to defaults', 'success');
        } catch (error) {
            console.error('Error resetting settings:', error);
            showStatus('saveStatus', 'Error resetting settings', 'error');
        }
    }
}

// Test connection to backend server
async function testConnection() {
    const serverUrl = document.getElementById('serverUrl').value.trim();

    if (!serverUrl) {
        showStatus('connectionStatus', 'Please enter a server URL', 'error');
        return;
    }

    showStatus('connectionStatus', 'Testing connection...', '');

    try {
        const response = await fetch(`${serverUrl}/health`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            timeout: 5000
        });

        if (response.ok) {
            const data = await response.json();
            showStatus('connectionStatus', `✅ Connected! Server status: ${data.status}`, 'success');
        } else {
            showStatus('connectionStatus', `❌ Server responded with error: ${response.status}`, 'error');
        }
    } catch (error) {
        console.error('Connection test failed:', error);
        showStatus('connectionStatus', '❌ Connection failed. Check URL and server status.', 'error');
    }
}

// Show status message
function showStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = type;

    // Clear status after 3 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            element.textContent = '';
            element.className = '';
        }, 3000);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Spectrum level slider
    document.getElementById('maxSpectrumLevel').addEventListener('input', (e) => {
        document.getElementById('spectrumLevelDisplay').textContent = e.target.value;
    });

    // Save settings button
    document.getElementById('saveSettings').addEventListener('click', saveSettings);

    // Reset settings button
    document.getElementById('resetSettings').addEventListener('click', resetSettings);

    // Test connection button
    document.getElementById('testConnection').addEventListener('click', testConnection);

    // Auto-save on form changes (with debounce)
    const formElements = [
        'morningEnforcement', 'maxSpectrumLevel', 'workStartTime',
        'enableNotifications', 'notificationFrequency', 'enableTaskBreakdown',
        'enablePatternDetection', 'serverUrl'
    ];

    let saveTimeout;
    formElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(saveSettings, 1000); // Auto-save after 1 second of no changes
            });
        }
    });
}

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveSettings();
    }
});