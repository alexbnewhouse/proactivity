// Theme management utilities for Proactivity

class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
    this.applyTheme(this.currentTheme);
    this.setupSystemThemeListener();
  }

  getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  getStoredTheme() {
    try {
      return localStorage.getItem('proactivity-theme') || 
             chrome?.storage?.sync?.get?.(['theme'])?.theme;
    } catch {
      return null;
    }
  }

  async storeTheme(theme) {
    try {
      localStorage.setItem('proactivity-theme', theme);
      if (chrome?.storage?.sync) {
        await chrome.storage.sync.set({ theme });
      }
    } catch (error) {
      console.warn('Could not store theme preference:', error);
    }
  }

  applyTheme(theme, withTransition = true) {
    const html = document.documentElement;
    
    if (!withTransition) {
      html.classList.add('theme-switching');
    }

    html.setAttribute('data-theme', theme);
    this.currentTheme = theme;

    // Remove transition class after a brief delay
    if (!withTransition) {
      setTimeout(() => {
        html.classList.remove('theme-switching');
      }, 50);
    }

    // Update theme toggle icon if it exists
    this.updateThemeToggleIcon();
    
    // Dispatch theme change event
    window.dispatchEvent(new CustomEvent('themechange', { 
      detail: { theme } 
    }));
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  async setTheme(theme) {
    this.applyTheme(theme);
    await this.storeTheme(theme);
  }

  setupSystemThemeListener() {
    // Only listen to system changes if user hasn't set a preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!this.getStoredTheme()) {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  updateThemeToggleIcon() {
    const sunIcon = document.querySelector('.theme-toggle-icon.sun');
    const moonIcon = document.querySelector('.theme-toggle-icon.moon');
    
    if (sunIcon && moonIcon) {
      if (this.currentTheme === 'dark') {
        sunIcon.style.opacity = '0.5';
        moonIcon.style.opacity = '1';
      } else {
        sunIcon.style.opacity = '1';
        moonIcon.style.opacity = '0.5';
      }
    }
  }

  // Create theme toggle button
  createThemeToggle() {
    const toggle = document.createElement('button');
    toggle.className = 'theme-toggle';
    toggle.setAttribute('aria-label', 'Toggle theme');
    toggle.innerHTML = `
      <svg class="theme-toggle-icon sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"/>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
      <svg class="theme-toggle-icon moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    `;
    
    toggle.addEventListener('click', () => this.toggleTheme());
    this.updateThemeToggleIcon();
    
    return toggle;
  }

  // Initialize theme toggle in header
  initializeThemeToggle(containerSelector = '.header-actions') {
    const container = document.querySelector(containerSelector);
    if (container) {
      const toggle = this.createThemeToggle();
      container.appendChild(toggle);
    }
  }
}

// Auto-initialize theme manager
window.themeManager = new ThemeManager();

// Utility function for other scripts
window.toggleTheme = () => window.themeManager.toggleTheme();
window.setTheme = (theme) => window.themeManager.setTheme(theme);