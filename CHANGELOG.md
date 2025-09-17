# Changelog

All notable changes to the Dissertation Support plugin will be documented in this file.

## [2.1.0] - 2024-12-19

### 🚀 Major Enhancements

#### AI Planning Integration
- **Fixed AI Planning Commands**: Resolved issue where AI planning commands failed despite correct API key
- **Automatic File Creation**: AI plans now properly save to markdown files with proper metadata
- **Smart Error Handling**: Enhanced fallback mechanisms for AI planning failures

#### Project Start Integration
- **Automatic Dissertation Planning**: When creating dissertation projects, AI planning triggers automatically
- **Smart Topic Detection**: Project titles automatically populate dissertation topic settings
- **Seamless Kanban Integration**: New projects instantly appear in Kanban board dropdown
- **Context-Aware Features**: System detects project type and provides appropriate functionality

#### Kanban Board Enhancements
- **Interactive Card Management**: Full functionality for editing, completing, and managing cards
- **Visual Progress Tracking**: Enhanced progress indicators with subtask breakdown
- **Improved UI**: Better button styling, hover effects, and visual feedback
- **Comprehensive Testing**: Added extensive test suite for card actions and functionality

### 🛠️ Technical Improvements
- **Enhanced Service Integration**: Better communication between AI, Planning, and Kanban services
- **Improved Error Handling**: More graceful degradation when services are unavailable
- **Code Quality**: Added comprehensive unit tests for critical functionality
- **Performance**: Optimized service initialization and data persistence

### 🔧 Bug Fixes
- Fixed AI planning command execution flow
- Resolved service initialization order issues
- Improved project context detection and handling
- Enhanced error messaging and user feedback

### 📚 Documentation
- Updated README files to reflect new functionality
- Enhanced feature descriptions and usage examples
- Added comprehensive setup and integration guides
- Improved troubleshooting documentation

---

## [2.0.0] - 2024-12-15

### 🚀 Major Features
- AI Project Initiation Dialogue system
- 6 Academic Project Templates
- Visual Project Kanban Boards
- Enhanced Welcome Guide
- Comprehensive ADHD-friendly design patterns

### 🛠️ Core Infrastructure
- Modular service architecture
- TypeScript codebase with full type safety
- Comprehensive test suite
- ADHD-optimized user experience patterns

---

## [1.0.0] - 2024-11-30

### 🚀 Initial Release
- Basic proactive reminder system
- Simple AI planning functionality
- Daily micro-task management
- Context preservation with resume cards
- Foundation for academic productivity workflows

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backwards compatible manner  
- **PATCH** version for backwards compatible bug fixes

## Support

For questions, bug reports, or feature requests:
- 🐛 [Report Issues](https://github.com/alexbnewhouse/proactivity/issues)
- 💡 [Feature Requests](https://github.com/alexbnewhouse/proactivity/discussions)
- 📧 Contact: Built by someone with ADHD, for people with ADHD