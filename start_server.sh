#!/bin/bash
# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install requirements if needed
# We can check for a marker file or just try to install (pip is fast if cached)
echo "Installing/Updating requirements..."
pip install -r requirements.txt

# Run server
echo "Starting FastAPI server..."
python server.py
