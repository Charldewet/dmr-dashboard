#!/bin/zsh

# Script to stop the DMR Dashboard backend and frontend servers

# Get the directory where the script is located
SCRIPT_DIR=$(cd -- \"$(dirname -- \"${BASH_SOURCE[0]:-$0}\")\" &> /dev/null && pwd)

# Navigate to the script's directory (project root)
cd \"$SCRIPT_DIR\"

BACKEND_PID_FILE=".backend_pid"
FRONTEND_PID_FILE=".frontend_pid"

# Function to kill a process and remove its PID file
kill_process() {
  local pid_file=$1
  local process_name=$2

  if [ -f \"$pid_file\" ]; then
    local pid=$(cat \"$pid_file\")
    # Check if PID is a number and exists
    if [[ \"$pid\" =~ ^[0-9]+$ ]] && ps -p $pid > /dev/null; then
      echo \"Stopping $process_name (PID: $pid)...\"
      kill $pid
      # Check if kill was successful
      if [ $? -eq 0 ]; then
        echo \"$process_name stopped successfully.\"
        rm \"$pid_file\" # Remove PID file on successful kill
      else
        echo \"Failed to stop $process_name (PID: $pid). It might have already stopped or requires force kill (-9).\"
      fi
    else
      echo \"$process_name (PID: $pid from $pid_file) not found or PID invalid. Maybe it already stopped?\"
      rm \"$pid_file\" # Remove invalid PID file
    fi
  else
    echo \"PID file ($pid_file) not found. Cannot stop $process_name.\"
  fi
}

# Kill the backend process
kill_process $BACKEND_PID_FILE \"Flask Backend\"

# Kill the frontend process
kill_process $FRONTEND_PID_FILE \"React Frontend\"

echo \"\"
echo \"Stop script finished.\"

# Keep terminal open briefly to see messages
sleep 3 

exit 0 