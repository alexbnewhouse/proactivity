#!/bin/bash

# Proactivity Development Setup Script
# This script sets up the entire Proactivity ecosystem for immediate use

set -e

echo "🚀 Setting up Proactivity - Your ADHD-friendly productivity assistant"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed: $NODE_VERSION"
    else
        print_error "Node.js is not installed. Please install Node.js from https://nodejs.org/"
        exit 1
    fi
}

# Check if npm is installed
check_npm() {
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm is installed: $NPM_VERSION"
    else
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
}

# Install root dependencies
install_root_deps() {
    print_status "Installing root dependencies..."
    if [ -f "package.json" ]; then
        npm install
        print_success "Root dependencies installed"
    else
        print_warning "No root package.json found, skipping root dependencies"
    fi
}

# Install backend dependencies
install_backend_deps() {
    print_status "Installing backend dependencies..."
    cd src/backend
    if [ -f "package.json" ]; then
        npm install
        print_success "Backend dependencies installed"
    else
        print_warning "No backend package.json found"
    fi
    cd ../..
}

# Install frontend dependencies
install_frontend_deps() {
    print_status "Installing frontend dependencies..."
    cd src/frontend
    if [ -f "package.json" ]; then
        npm install
        print_success "Frontend dependencies installed"
    else
        print_warning "No frontend package.json found"
    fi
    cd ../..
}

# Install Obsidian plugin dependencies
install_obsidian_deps() {
    print_status "Installing Obsidian plugin dependencies..."
    cd src/obsidian-plugin
    if [ -f "package.json" ]; then
        npm install
        print_success "Obsidian plugin dependencies installed"
    else
        print_warning "No Obsidian plugin package.json found"
    fi
    cd ../..
}

# Create environment files
create_env_files() {
    print_status "Creating environment configuration files..."

    # Backend .env
    if [ ! -f ".env" ]; then
        cp .env.example .env
        print_success "Created .env file from template"
        print_warning "Please edit .env with your API keys and configuration"
    else
        print_warning ".env file already exists, skipping creation"
    fi
}

# Build Obsidian plugin
build_obsidian_plugin() {
    print_status "Building Obsidian plugin..."
    cd src/obsidian-plugin
    if [ -f "package.json" ]; then
        npm run build
        print_success "Obsidian plugin built successfully"
    else
        print_warning "Cannot build Obsidian plugin - no package.json found"
    fi
    cd ../..
}

# Create development scripts
create_dev_scripts() {
    print_status "Creating convenient development scripts..."

    # Create start-all script
    cat > start-all.sh << 'EOF'
#!/bin/bash
# Start all Proactivity services in development mode

echo "🚀 Starting Proactivity development servers..."

# Start backend
echo "Starting backend server..."
(cd src/backend && npm run dev) &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "Starting frontend development server..."
(cd src/frontend && npm run dev) &
FRONTEND_PID=$!

# Save PIDs for cleanup
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

echo "✅ All services started!"
echo "📖 Backend: http://localhost:3001"
echo "🎨 Frontend: http://localhost:3000"
echo "🧠 Obsidian plugin: Load from src/obsidian-plugin"
echo "🌐 Browser extension: Load from src/browser-extension"
echo ""
echo "To stop all services, run: ./stop-all.sh"

# Keep script running
wait
EOF

    # Create stop-all script
    cat > stop-all.sh << 'EOF'
#!/bin/bash
# Stop all Proactivity development services

echo "🛑 Stopping Proactivity development servers..."

# Kill backend
if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    kill $BACKEND_PID 2>/dev/null || echo "Backend already stopped"
    rm .backend.pid
fi

# Kill frontend
if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    kill $FRONTEND_PID 2>/dev/null || echo "Frontend already stopped"
    rm .frontend.pid
fi

# Kill any remaining node processes on these ports
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

echo "✅ All services stopped!"
EOF

    # Create quick-test script
    cat > quick-test.sh << 'EOF'
#!/bin/bash
# Quick health check for all Proactivity services

echo "🔍 Testing Proactivity services..."

# Test backend
echo "Testing backend..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not responding"
fi

# Test frontend
echo "Testing frontend..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is running"
else
    echo "❌ Frontend is not responding"
fi

echo "Done!"
EOF

    # Make scripts executable
    chmod +x start-all.sh stop-all.sh quick-test.sh

    print_success "Development scripts created: start-all.sh, stop-all.sh, quick-test.sh"
}

# Create browser extension install instructions
create_extension_instructions() {
    print_status "Creating browser extension installation instructions..."

    cat > BROWSER_EXTENSION_INSTALL.md << 'EOF'
# Installing the Proactivity Browser Extension

## Chrome/Edge Installation

1. Open Chrome or Edge browser
2. Navigate to `chrome://extensions/` or `edge://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `src/browser-extension` folder from this project
6. The Proactivity extension should now appear in your extensions

## Firefox Installation

1. Open Firefox browser
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to `src/browser-extension` and select `manifest.json`
5. The extension will be loaded temporarily

## Usage

- Click the brain icon in your browser toolbar to open the popup
- Set your current energy level
- Enable the interventions you want
- The extension will gently guide you when it detects procrastination or distraction patterns

## Configuration

1. Click the extension icon
2. Go to Settings (gear icon)
3. Configure your:
   - Backend URL (if running the full Proactivity server)
   - Intervention preferences
   - Notification settings

Enjoy your ADHD-friendly browsing experience! 🧠✨
EOF

    print_success "Browser extension installation guide created"
}

# Create Obsidian plugin install instructions
create_obsidian_instructions() {
    print_status "Creating Obsidian plugin installation instructions..."

    cat > OBSIDIAN_PLUGIN_INSTALL.md << 'EOF'
# Installing the Proactivity Obsidian Plugin

## Prerequisites

- Obsidian v0.15.0 or higher
- Proactivity backend server running (optional, for full features)

## Installation

### Method 1: Manual Installation

1. Copy the `src/obsidian-plugin` folder to your vault's `.obsidian/plugins/` directory
2. Rename the folder to `proactivity`
3. Enable "Community plugins" in Obsidian Settings
4. Find "Proactivity" in your plugins list and enable it

### Method 2: Development Installation

1. Navigate to your vault's `.obsidian/plugins/` directory
2. Create a symbolic link to the plugin:
   ```bash
   ln -s /path/to/proactivity/src/obsidian-plugin proactivity
   ```
3. Enable the plugin in Obsidian

## Configuration

1. Open Obsidian Settings
2. Navigate to "Community plugins" → "Proactivity"
3. Configure:
   - OpenAI API key (for task breakdown)
   - Backend server URL (if running full Proactivity)
   - ADHD support preferences
   - Notification settings

## Usage

- Click the brain icon in the left ribbon to open the Proactivity panel
- Use Ctrl/Cmd+P to access Proactivity commands
- Let the plugin learn your patterns and provide gentle guidance

The plugin is designed specifically for ADHD brains - it will be gentle, supportive, and respect your focus states! 🧠💚
EOF

    print_success "Obsidian plugin installation guide created"
}

# Print final instructions
print_final_instructions() {
    echo ""
    echo "🎉 Proactivity Development Setup Complete!"
    echo "========================================"
    echo ""
    echo "Next steps:"
    echo "1. Edit .env file with your API keys"
    echo "2. Run ./start-all.sh to start all development servers"
    echo "3. Install browser extension (see BROWSER_EXTENSION_INSTALL.md)"
    echo "4. Install Obsidian plugin (see OBSIDIAN_PLUGIN_INSTALL.md)"
    echo ""
    echo "URLs:"
    echo "📖 Backend API: http://localhost:3001"
    echo "🎨 Frontend: http://localhost:3000"
    echo "📚 API Docs: http://localhost:3001/docs"
    echo ""
    echo "For help:"
    echo "- Read README.md for detailed documentation"
    echo "- Check docs/ folder for specific component docs"
    echo "- Run ./quick-test.sh to verify all services"
    echo ""
    echo "Happy coding! Remember: progress over perfection 🌟"
}

# Main execution
main() {
    print_status "Starting Proactivity development setup..."

    check_node
    check_npm
    install_root_deps
    install_backend_deps
    install_frontend_deps
    install_obsidian_deps
    create_env_files
    build_obsidian_plugin
    create_dev_scripts
    create_extension_instructions
    create_obsidian_instructions

    print_final_instructions
}

# Run main function
main