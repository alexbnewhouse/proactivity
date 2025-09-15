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
