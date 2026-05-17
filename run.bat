@echo off
echo ─────────────────────────────────────
echo   Daily Activity Tracker — Startup
echo ─────────────────────────────────────
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
echo Installing dependencies...
pip install -r requirements.txt -q
echo Starting server at http://127.0.0.1:5000
echo Login: Team1 / Ford123
echo ─────────────────────────────────────
python app.py
