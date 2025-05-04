#!/bin/zsh

# Script to start the DMR Dashboard backend and frontend servers
# ASSUMPTION: This script is located in the project root directory
#             and is run from that directory.

echo "Activating virtual environment..."
source venv/bin/activate
if [ $? -ne 0 ]; then
  echo "Error: Failed to activate virtual environment. Make sure 'venv' exists."
  exit 1
fi

# Determine the absolute path to the project root (where the script is)
PROJECT_ROOT="$(pwd)"
echo "Project Root: $PROJECT_ROOT"

# Explicitly set the absolute database path as an environment variable
export DATABASE_URL="sqlite:///$PROJECT_ROOT/reports.db"
echo "Using DATABASE_URL: $DATABASE_URL"

echo "Starting Flask backend server on port 5001..."
# Run Flask in background, logging to backend.log in project root
flask --app backend/app.py run --port 5001 > "$PROJECT_ROOT/backend.log" 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID Log: backend.log"
echo $BACKEND_PID > "$PROJECT_ROOT/.backend_pid"

echo "Starting React frontend server..."
# Navigate to frontend dir to run npm start, logging to frontend.log in project root
cd "$PROJECT_ROOT/frontend"
if [ $? -ne 0 ]; then
  echo "Error: Failed to change directory to frontend"
  # Attempt to kill backend if frontend fails to start
  if [ -n "$BACKEND_PID" ] && ps -p $BACKEND_PID > /dev/null; then kill $BACKEND_PID; fi
  exit 1
fi
npm start > "$PROJECT_ROOT/frontend.log" 2>&1 &
FRONTEND_PID=$!
cd "$PROJECT_ROOT" # Go back to project root IMPORTANT!
echo "Frontend PID: $FRONTEND_PID Log: frontend.log"
echo $FRONTEND_PID > "$PROJECT_ROOT/.frontend_pid"

echo "Waiting 5 seconds for servers to start..."
sleep 5

echo "Opening http://localhost:3000 in your default browser..."
open http://localhost:3000

echo ""
echo "Dashboard should be open in your browser."
echo "Servers are running in the background."
B_PID="$(cat .backend_pid 2>/dev/null)"
F_PID="$(cat .frontend_pid 2>/dev/null)"
echo "To stop them, run: kill $B_PID $F_PID"
echo "(Or run the stop_dashboard.command script)"

exit 0 