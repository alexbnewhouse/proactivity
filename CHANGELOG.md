# Changelog

All notable changes to the Dissertation Support plugin will be documented in this file.

## [2.2.0] - 2024-12-20

### ✨ Latest Enhancements

#### UX & Onboarding Improvements
- **One-Time API Key Prompts**: New users are prompted to add API key on first project creation, with option to skip to local mode
- **Streamlined Interface**: Removed popup tips system in favor of comprehensive Welcome Guide with ADHD-specific tips
- **Enhanced Settings Flag**: Added tracking to prevent repeated API key prompts per session

#### Session Tracking & Analytics (NEW!)
- **Work Pattern Monitoring**: Track session duration, tasks completed, and productivity metrics
- **Hyperfocus Detection**: Gentle break reminders during extended work sessions (configurable intervals)
- **Session Analytics View**: New dedicated view for visualizing work patterns over time
- **ADHD-Friendly Insights**: Non-judgmental break suggestions with customizable timing

#### Kanban Board Management
- **Board Settings Panel**: Full board management with rename and delete functionality  
- **Enhanced Board Persistence**: Improved board state restoration and management
- **Settings Integration**: Board operations properly integrated with confirmation modals

#### Quick Capture & Content Routing (NEW!)
- **Intelligent Quick Capture**: Smart content categorization for rapid idea capture
- **Automatic Content Routing**: Routes captured content to appropriate project contexts
- **Multiple Content Types**: Handles tasks, ideas, research notes, and more
- **Context-Aware Processing**: Understands current project context for better organization

#### Comprehensive Testing Suite
- **Session Tracking Tests**: 10 comprehensive tests covering metrics, hyperfocus detection, break management
- **Quick Capture Tests**: 11 tests for content categorization and routing logic  
- **Enhanced Test Coverage**: 21 total new tests ensuring reliability of new features

### 🛠️ Technical Improvements
- **Clean Code Architecture**: Removed legacy tips system while preserving welcome page functionality
- **Enhanced Service Integration**: Better separation of concerns between tracking, capture, and management services
- **Improved Error Handling**: More robust error handling for new features
- **TypeScript Enhancements**: Updated interfaces and type safety for new functionality

### 🔧 Bug Fixes
- Fixed TypeScript compilation issues after interface changes
- Resolved Kanban board settings button functionality
- Enhanced API key validation and storage
- Improved service initialization reliability

### 📚 Documentation Updates
- **README Enhancements**: Updated both main and plugin README files with latest features
- **Feature Documentation**: Comprehensive documentation of new session tracking and quick capture features
- **Setup Guide Updates**: Revised installation and setup instructions for new API key flow
- **Settings Documentation**: Updated configuration tables with new session tracking options

---

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