# Proactivity Browser Extension - Installation Guide

This guide covers installation for all supported browsers including Vivaldi, Safari, Chrome, Firefox, and Edge.

## Browser Support

✅ **Fully Supported:**
- Chrome
- Edge
- Vivaldi
- Brave
- Arc
- Opera

🚧 **Safari Support:**
Safari support is planned but requires conversion to Safari Web Extension format. Chrome/Vivaldi users get full functionality.

---

## Installation Methods

### Method 1: Chrome Web Store (Recommended for Chrome/Edge)
*Note: Publishing to Chrome Web Store pending*

1. Visit the Chrome Web Store
2. Search for "Proactivity Focus Assistant"
3. Click "Add to Chrome/Edge"
4. Pin the extension to your toolbar

### Method 2: Vivaldi Installation (Developer Mode)

**Vivaldi works perfectly with Chrome extensions!**

1. **Download Extension Files**
   ```bash
   # Clone the repository
   git clone https://github.com/alexbnewhouse/proactivity.git
   cd proactivity/src/browser-extension
   ```

2. **Install in Vivaldi**
   - Open Vivaldi
   - Go to `vivaldi://extensions/` (or Settings → Extensions)
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `proactivity/src/browser-extension` folder
   - Pin the extension to your toolbar

3. **Vivaldi-Specific Features**
   - Works with Vivaldi's tab stacking
   - Integrates with Vivaldi's sidebar (experimental)
   - Respects Vivaldi's theme colors
   - Compatible with Vivaldi's workspace feature

### Method 3: Safari Installation (Future)

Safari support requires Safari Web Extension conversion:

1. **Requirements**
   - macOS 10.14.4 or later
   - Safari 14 or later
   - Xcode (for development)

2. **Current Status**
   - Safari version is in development
   - Will be available on Mac App Store
   - Consider using Chrome/Vivaldi for now

### Method 4: Firefox Installation (Developer Mode)

1. **Download and Prepare**
   ```bash
   # Clone repository
   git clone https://github.com/alexbnewhouse/proactivity.git
   cd proactivity/src/browser-extension
   ```

2. **Install in Firefox**
   - Open Firefox
   - Go to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select `manifest.json` from the browser-extension folder
   - Extension will be temporary until Firefox version is published

### Method 5: Manual Installation (All Chromium Browsers)

Works for: Chrome, Edge, Brave, Opera, Vivaldi, Arc

1. **Download Extension**
   ```bash
   git clone https://github.com/alexbnewhouse/proactivity.git
   cd proactivity/src/browser-extension
   ```

2. **Load Extension**
   - Open your browser
   - Go to extensions page:
     - Chrome: `chrome://extensions/`
     - Edge: `edge://extensions/`
     - Brave: `brave://extensions/`
     - Opera: `opera://extensions/`
     - Vivaldi: `vivaldi://extensions/`
     - Arc: Use Chrome Web Store or developer mode

3. **Enable Developer Mode**
   - Toggle "Developer mode" switch (usually top right)

4. **Install Extension**
   - Click "Load unpacked"
   - Select the `browser-extension` folder
   - Extension will appear in your toolbar

---

## Post-Installation Setup

### Initial Configuration

1. **Click the Extension Icon** in your toolbar
2. **Set Your Energy Level** (High ⚡, Moderate 🔋, Low 🪫, Depleted 😴)
3. **Connect to Backend** (optional but recommended):
   - Start the Proactivity backend server
   - Extension will auto-connect to `localhost:3001`
   - Green dot = connected, Red dot = offline mode

### Obsidian Integration Setup

1. **Install Obsidian Plugin** (if using Obsidian)
   ```bash
   # Run the installation script
   ./install-obsidian-plugin.sh
   ```

2. **Enable Sync in Both Apps**
   - Obsidian: Settings → Proactivity → Enable Browser Sync
   - Browser: Extension options → Enable Obsidian Sync

3. **Sync Features**
   - ✅ Tasks sync between browser and Obsidian
   - 🔋 Energy levels stay synchronized
   - ⏱️ Focus sessions work across both platforms
   - 🎯 Website blocking applies universally

### Vivaldi-Specific Setup

1. **Sidebar Integration** (Experimental)
   - Right-click Vivaldi sidebar → Add Web Panel
   - URL: `vivaldi-extension://[extension-id]/dashboard.html`
   - Get extension ID from `vivaldi://extensions/`

2. **Workspace Integration**
   - Extension respects Vivaldi workspaces
   - Tasks can be organized per workspace
   - Focus sessions apply to current workspace only

3. **Tab Stack Support**
   - Works with Vivaldi's tab stacking
   - Can block/unblock entire tab stacks
   - Focus mode affects all tabs in stack

---

## Browser-Specific Features

### Chrome
- Full extension API support
- Desktop notifications
- Keyboard shortcuts
- Sync with Chrome profile

### Edge
- Enterprise policy support
- Collections integration (planned)
- Microsoft 365 integration (planned)

### Vivaldi
- Tab stacking support
- Sidebar panel integration
- Workspace awareness
- Theme color adaptation

### Safari (Future)
- Native macOS notifications
- Shortcuts app integration
- iCloud sync support
- Screen Time integration

### Firefox
- Container tabs support
- Enhanced privacy mode
- Custom CSS styling support

---

## Troubleshooting

### Extension Not Working

1. **Check Browser Support**
   - Ensure you're using a supported browser version
   - Chrome 88+, Edge 88+, Vivaldi 3.0+

2. **Verify Permissions**
   - Extension needs "Access your data on all websites"
   - Grant permissions in extension settings

3. **Clear Extension Data**
   - Go to browser settings → Extensions
   - Find Proactivity → Storage → Clear data
   - Restart browser

### Vivaldi-Specific Issues

1. **Extension Not Loading**
   - Ensure Developer mode is enabled
   - Check Vivaldi version (3.0+ required)
   - Disable other focus/productivity extensions

2. **Sidebar Panel Not Working**
   - Verify extension ID is correct
   - Check Web Panel URL format
   - Try refreshing the panel

### Obsidian Sync Issues

1. **Tasks Not Syncing**
   - Check localStorage access in browser console
   - Ensure backend server is running
   - Verify both apps have sync enabled

2. **Energy Levels Out of Sync**
   - Manually sync in Obsidian plugin
   - Check browser extension storage
   - Restart both applications

### Performance Issues

1. **High CPU/Memory Usage**
   - Disable unused features in settings
   - Reduce notification frequency
   - Clear browser cache and extension data

2. **Slow Page Loading**
   - Check content script filters
   - Disable on heavy websites
   - Adjust intervention settings

---

## Advanced Configuration

### Custom Backend URL

If running backend on different port/server:

```javascript
// In extension options
{
  "serverUrl": "http://your-server:3001",
  "enableSync": true
}
```

### Enterprise Deployment

For IT administrators:

1. **Chrome Enterprise**
   - Use Chrome Enterprise policy
   - Force-install extension via GPO
   - Configure default settings

2. **Edge for Business**
   - Microsoft 365 admin center
   - Extension management policies
   - Centralized configuration

### Developer Setup

For extension development:

```bash
# Install dependencies
cd src/browser-extension
npm install

# Build extension
npm run build

# Run tests
npm test

# Watch for changes (development)
npm run dev
```

---

## Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/alexbnewhouse/proactivity/issues)
- **Documentation**: Check the main README for detailed usage
- **Discord**: Join our community (link in main README)

## Version History

- **v1.0.1**: Vivaldi support added, Safari preparation
- **v1.0.0**: Initial release with Chrome/Edge support
- **v0.9.x**: Beta releases and testing

---

**Happy Focusing! 🧠💪**

*The Proactivity extension is designed specifically for ADHD brains - it will be gentle, supportive, and respect your focus states.*