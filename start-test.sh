#!/bin/bash

# Start backend
echo "Starting backend..."
cd backend
python3 -m app.main &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend
echo "Starting frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# Wait a bit for both to start
sleep 5

echo "Services started. Press Ctrl+C to stop."
wait