#!/bin/bash
echo "─────────────────────────────────────"
echo "  Daily Activity Tracker — Startup"
echo "─────────────────────────────────────"

# Create venv if not present
if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

# Activate
source venv/bin/activate

# Install deps
echo "Installing dependencies..."
pip install -r requirements.txt -q

# Run
echo "Starting server at http://127.0.0.1:5000"
echo "Login: Team1 / Ford123"
echo "─────────────────────────────────────"
python app.py
