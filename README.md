# Daily Activity Tracker v2

Ford Internal · EOD Activity Logging Tool

Internal EOD activity tracking dashboard for dev teams — built with Flask & SQLAlchemy. \
Logs PRs, Jira tickets, and daily fixes with search, CSV export, and auth.

## What's New in v2
- 🔐 Login authentication (Team1 / Ford123)
- 🌙 Dark / Light theme toggle (persists across sessions)
- 👥 Name dropdown (pre-seeded team member list)
- 🔗 Multi-PR support — paste comma-separated PR links → renders as clickable chips (PR#819, PR#820) with full-URL tooltip on hover
- 🔍 Search & filter — filter today's table by name or module instantly
- ⬇ CSV Export — download today's entries or full history as CSV

## Folder Structure
```
daily-activity-tracker/
├── app.py                   ← Flask app + SQLAlchemy + auth + CSV export
├── requirements.txt
├── run.sh                   ← One-click start (Mac/Linux)
├── run.bat                  ← One-click start (Windows)
├── instance/
│   └── activity_tracker.db  ← Auto-created SQLite DB
├── templates/
│   ├── login.html
│   └── index.html
└── static/
    ├── css/style.css
    └── js/app.js
```

## Setup & Run

### Mac / Linux
```bash
cd daily-activity-tracker
bash run.sh
```

### Windows
Double-click `run.bat`  OR in Command Prompt:
```
cd daily-activity-tracker
run.bat
```

### Manual setup
```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Open: **http://127.0.0.1:5000**
Login: **Team1 / Ford123**

## Customising the Team Member List
Edit `app.py`, find `TEAM_MEMBERS = [...]` and update the names.

## Changing Login Credentials
Edit `app.py`:
```python
AUTH_USERNAME = 'Team1'
AUTH_PASSWORD = 'Ford123'
```

## Multi-PR Usage
In the PR Links field, paste URLs separated by commas:
```
https://github.com/FORD-PhoenixAutomation/lighting-tests/pull/819, https://github.com/FORD-PhoenixAutomation/lighting-tests/pull/820
```
The table will show chips: [⎇ PR#819] [⎇ PR#820] — hover for full URL.

## Production / Office-wide Deployment
Change the last line of app.py:
```python
app.run(host='0.0.0.0', port=5000, debug=False)
```
Then share: `http://<YOUR_IP>:5000`

For persistent hosting use Gunicorn:
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```
