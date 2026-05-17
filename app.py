from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date
import re, os, io, csv

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///activity_tracker.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = 'dat-secret-key-ford-2024'   # change in production

db = SQLAlchemy(app)

# ── AUTH CONFIG ──────────────────────────────────────────
AUTH_USERNAME = 'Team1'
AUTH_PASSWORD = 'Ford123'

# ── PRE-SEEDED TEAM MEMBERS ──────────────────────────────
TEAM_MEMBERS = [
    "Rupam Barad", "Atraindra Gupta", "Sachin Yadav", "Dheeraj G"
]

# ── MODEL ────────────────────────────────────────────────
class Activity(db.Model):
    id         = db.Column(db.Integer,  primary_key=True)
    name       = db.Column(db.String(100), nullable=False)
    module     = db.Column(db.String(200), nullable=False)
    pr_links   = db.Column(db.Text,        nullable=False)   # comma-separated URLs
    jira_links = db.Column(db.Text,        nullable=True)    # comma-separated Jira ticket URLs
    num_fixes  = db.Column(db.Integer,     nullable=False)
    date       = db.Column(db.Date,        nullable=False, default=date.today)
    created_at = db.Column(db.DateTime,    default=datetime.utcnow)

    def to_dict(self):
        links = [l.strip() for l in self.pr_links.split(',') if l.strip()]
        jlinks = [l.strip() for l in (self.jira_links or '').split(',') if l.strip()]
        return {
            'id':        self.id,
            'name':      self.name,
            'module':    self.module,
            'pr_links':  links,
            'jira_links': jlinks,
            'num_fixes': self.num_fixes,
            'date':      self.date.strftime('%d %b %Y'),
        }

# ── AUTH HELPERS ─────────────────────────────────────────
def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated

def api_login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('logged_in'):
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

# ── PAGE ROUTES ───────────────────────────────────────────
@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        u = request.form.get('username', '').strip()
        p = request.form.get('password', '').strip()
        if u == AUTH_USERNAME and p == AUTH_PASSWORD:
            session['logged_in'] = True
            return redirect(url_for('index'))
        error = 'Invalid username or password.'
    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    return render_template('index.html', team_members=TEAM_MEMBERS)

# ── API ROUTES ────────────────────────────────────────────
@app.route('/api/submit', methods=['POST'])
@api_login_required
def submit():
    data = request.get_json()
    try:
        raw = data.get('pr_links', '').strip()
        links = [l.strip() for l in re.split(r'[,\n]+', raw) if l.strip()]
        if not links:
            return jsonify({'success': False, 'error': 'At least one PR link is required'}), 400

        raw_jira = data.get('jira_links', '').strip()
        jlinks = [l.strip() for l in re.split(r'[,\n]+', raw_jira) if l.strip()]

        entry = Activity(
            name       = data['name'].strip(),
            module     = data['module'].strip(),
            pr_links   = ','.join(links),
            jira_links = ','.join(jlinks) if jlinks else None,
            num_fixes  = int(data['num_fixes']),
            date      = date.today(),
        )
        db.session.add(entry)
        db.session.commit()
        return jsonify({'success': True, 'entry': entry.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/today')
@api_login_required
def today_entries():
    entries = (Activity.query
               .filter_by(date=date.today())
               .order_by(Activity.created_at).all())
    return jsonify([e.to_dict() for e in entries])

@app.route('/api/history')
@api_login_required
def history():
    rows = (Activity.query
            .filter(Activity.date != date.today())
            .order_by(Activity.date.desc(), Activity.created_at).all())
    grouped = {}
    for r in rows:
        key = r.date.strftime('%d %b %Y')
        grouped.setdefault(key, []).append(r.to_dict())
    return jsonify(grouped)

@app.route('/api/delete/<int:entry_id>', methods=['DELETE'])
@api_login_required
def delete_entry(entry_id):
    entry = Activity.query.get_or_404(entry_id)
    db.session.delete(entry)
    db.session.commit()
    return jsonify({'success': True})

def _build_csv_response(rows, fname):
    """Helper: turn a list of Activity rows into a CSV download response."""
    from flask import Response
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['S.No.', 'Name', 'Module', 'PR Links', 'Jira / NSD Tickets', 'No. of Fixes/NSDs', 'Date'])
    for i, r in enumerate(rows, 1):
        writer.writerow([i, r.name, r.module, r.pr_links, r.jira_links or '',
                         r.num_fixes, r.date.strftime('%d %b %Y')])
    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename="{fname}"'}
    )


@app.route('/api/export/csv')
@api_login_required
def export_csv():
    """Export TODAY's entries only."""
    scope = request.args.get('scope', 'today')
    if scope == 'today':
        rows  = Activity.query.filter_by(date=date.today()).order_by(Activity.created_at).all()
        fname = f"DAT_Today_{date.today().isoformat()}.csv"
    else:
        # scope=all → everything in DB including today (full dump)
        rows  = Activity.query.order_by(Activity.date.desc(), Activity.created_at).all()
        fname = f"DAT_FullDump_{date.today().isoformat()}.csv"
    return _build_csv_response(rows, fname)


@app.route('/api/export/history')
@api_login_required
def export_history():
    """Export ONLY past days (everything before today) from activity_tracker.db."""
    rows  = (Activity.query
             .filter(Activity.date != date.today())
             .order_by(Activity.date.desc(), Activity.created_at).all())
    fname = f"DAT_ActivityHistory_{date.today().isoformat()}.csv"
    return _build_csv_response(rows, fname)

# ── ENSURE TABLES EXIST ON EVERY STARTUP ─────────────────
# This runs regardless of how the app is launched (python app.py,
# gunicorn, run.bat, etc.) so the DB table is always created.
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
