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
    showBrowserCompatibilityInfo();
    await loadSettings();
    setupEventListeners();
});

// Detect browser type for compatibility
function getBrowserInfo() {
    const userAgent = navigator.userAgent;
    const isVivaldi = userAgent.includes('Vivaldi');
    const isChrome = userAgent.includes('Chrome') && !isVivaldi;
    const isEdge = userAgent.includes('Edg');

    return { isVivaldi, isChrome, isEdge };
}

// Show browser compatibility information
function showBrowserCompatibilityInfo() {
    const browserInfo = getBrowserInfo();
    const header = document.querySelector('header p');

    if (browserInfo.isVivaldi) {
        header.innerHTML = 'Configure your ADHD-friendly productivity settings<br><small style="color: #ffeb3b;">✨ Vivaldi detected - using enhanced compatibility mode</small>';
    } else if (browserInfo.isEdge) {
        header.innerHTML = 'Configure your ADHD-friendly productivity settings<br><small style="color: #90caf9;">🔷 Microsoft Edge detected - full compatibility</small>';
    } else if (browserInfo.isChrome) {
        header.innerHTML = 'Configure your ADHD-friendly productivity settings<br><small style="color: #81c784;">✅ Chrome detected - full compatibility</small>';
    }
}

// Load settings from Chrome storage
async function loadSettings() {
    try {
        // Use local storage as fallback for Vivaldi compatibility
        let settings;
        try {
            settings = await chrome.storage.sync.get(defaultSettings);
        } catch (syncError) {
            console.log('Sync storage not available, using local storage:', syncError);
            settings = await chrome.storage.local.get(defaultSettings);
        }

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

        // Try sync storage first, fallback to local for Vivaldi
        try {
            await chrome.storage.sync.set(settings);
        } catch (syncError) {
            console.log('Sync storage failed, using local storage:', syncError);
            await chrome.storage.local.set(settings);
        }

        showStatus('saveStatus', 'Settings saved successfully!', 'success');

        // Notify background script of settings change
        try {
            chrome.runtime.sendMessage({
                action: 'settingsUpdated',
                settings: settings
            });
        } catch (messageError) {
            console.log('Could not notify background script:', messageError);
        }

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