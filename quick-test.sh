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
