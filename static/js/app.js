// ── Daily Activity Tracker — app.js v2 ──

// ── THEME ────────────────────────────────────────────────
const THEME_KEY = 'dat-theme';
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem(THEME_KEY, theme);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}
// Load saved preference
applyTheme(localStorage.getItem(THEME_KEY) || 'dark');


// ── DATE DISPLAY ─────────────────────────────────────────
function formatDate(d) {
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function updateClock() {
  const now = new Date();
  const el  = document.getElementById('live-date');
  if (el) el.textContent = formatDate(now);
  const fd  = document.getElementById('form-date-display');
  if (fd) fd.textContent = formatDate(now);
}
updateClock();
setInterval(updateClock, 60000);


// ── TOAST ────────────────────────────────────────────────
let toastTimer;
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error-toast' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 3400);
}


// ── VALIDATION ───────────────────────────────────────────
function validate() {
  let ok = true;
  const nameEl = document.getElementById('f-name');
  const modEl  = document.getElementById('f-module');
  const prEl   = document.getElementById('f-pr');
  const fixEl  = document.getElementById('f-fixes');
  // f-jira is optional — no error if blank

  [nameEl, modEl, prEl, fixEl].forEach(el => el.classList.remove('error'));

  if (!nameEl.value.trim()) { nameEl.classList.add('error'); ok = false; }
  if (!modEl.value.trim())  { modEl.classList.add('error');  ok = false; }
  if (!prEl.value.trim())   { prEl.classList.add('error');   ok = false; }
  if (!fixEl.value.trim())  { fixEl.classList.add('error');  ok = false; }
  return ok;
}


// ── SUBMIT ───────────────────────────────────────────────
async function submitEntry() {
  if (!validate()) { showToast('Please fill in all fields.', true); return; }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.querySelector('.btn-label').textContent = 'Submitting…';

  const payload = {
    name:       document.getElementById('f-name').value.trim(),
    module:     document.getElementById('f-module').value.trim(),
    pr_links:   document.getElementById('f-pr').value.trim(),
    jira_links: document.getElementById('f-jira').value.trim(),
    num_fixes:  document.getElementById('f-fixes').value.trim(),
  };

  try {
    const res  = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
      clearForm();
      appendRow(data.entry, true);
      showToast(`✓ Entry logged for ${data.entry.name}`);
      updateCount(1);
    } else {
      showToast('Error: ' + data.error, true);
    }
  } catch (e) {
    showToast('Network error. Please try again.', true);
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-label').textContent = 'Submit Entry';
  }
}


// ── CLEAR FORM ───────────────────────────────────────────
function clearForm() {
  document.getElementById('f-name').value = '';
  document.getElementById('f-module').value = '';
  document.getElementById('f-pr').value = '';
  document.getElementById('f-jira').value = '';
  document.getElementById('f-fixes').value = '';
  ['f-name','f-module','f-pr','f-fixes'].forEach(id =>
    document.getElementById(id).classList.remove('error'));
}


// ── PR CHIP BUILDER ──────────────────────────────────────
/**
 * Given a URL like https://github.com/org/repo/pull/819
 * returns "PR#819"
 */
function prLabel(url) {
  const m = url.match(/\/pull\/(\d+)/i) || url.match(/\/pulls\/(\d+)/i)
            || url.match(/\/merge_requests\/(\d+)/i);
  if (m) return `PR#${m[1]}`;
  // fallback: last path segment
  const parts = url.replace(/\/$/, '').split('/');
  return parts[parts.length - 1] || 'PR';
}

function buildPrChips(prLinks) {
  const wrap = document.createElement('div');
  wrap.className = 'pr-chips';
  prLinks.forEach(url => {
    const a = document.createElement('a');
    a.className   = 'pr-chip';
    a.href        = url;
    a.target      = '_blank';
    a.rel         = 'noopener';
    a.setAttribute('data-url', url);
    a.innerHTML   = `<span class="pr-icon">⎇</span>${esc(prLabel(url))}`;
    wrap.appendChild(a);
  });
  return wrap;
}

// ── JIRA CHIP BUILDER ─────────────────────────────────────
/**
 * Given a URL like https://jira.ford.com/browse/PHXAUTO-819
 * returns "PHXAUTO-819"
 */
function jiraLabel(url) {
  // Match typical Jira ticket patterns: PROJ-123
  const m = url.match(/([A-Z][A-Z0-9]+-\d+)/);
  if (m) return m[1];
  // fallback: last path segment
  const parts = url.replace(/\/$/, '').split('/');
  return parts[parts.length - 1] || 'Ticket';
}

function buildJiraChips(jiraLinks) {
  if (!jiraLinks || jiraLinks.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'no-jira';
    empty.textContent = '—';
    return empty;
  }
  const wrap = document.createElement('div');
  wrap.className = 'pr-chips';   // reuse same flex column layout
  jiraLinks.forEach(url => {
    const a = document.createElement('a');
    a.className   = 'jira-chip';
    a.href        = url;
    a.target      = '_blank';
    a.rel         = 'noopener';
    a.setAttribute('data-url', url);
    a.innerHTML   = `<span class="pr-icon">🎯</span>${esc(jiraLabel(url))}`;
    wrap.appendChild(a);
  });
  return wrap;
}


// ── ROW BUILDER ──────────────────────────────────────────
let rowCount = 0;

function appendRow(entry, animate = false) {
  const tbody = document.getElementById('today-tbody');
  const emptyRow = document.getElementById('empty-row');
  if (emptyRow) emptyRow.remove();

  rowCount++;
  const tr = document.createElement('tr');
  if (animate) tr.className = 'new-row';
  tr.dataset.name   = entry.name.toLowerCase();
  tr.dataset.module = entry.module.toLowerCase();

  tr.innerHTML = `
    <td class="sno-cell">${rowCount.toString().padStart(2,'0')}</td>
    <td class="name-cell">${esc(entry.name)}</td>
    <td class="module-cell">${esc(entry.module)}</td>
    <td class="pr-cell"></td>
    <td class="jira-cell"></td>
    <td class="fixes-cell"><span class="fixes-badge">${entry.num_fixes}</span></td>
    <td class="date-cell">${entry.date}</td>
    <td><button class="del-btn" onclick="deleteEntry(${entry.id},this)" title="Delete">✕</button></td>
  `;

  const prCell   = tr.querySelector('.pr-cell');
  const links    = Array.isArray(entry.pr_links) ? entry.pr_links : [entry.pr_links];
  prCell.appendChild(buildPrChips(links));

  const jiraCell  = tr.querySelector('.jira-cell');
  const jlinks    = Array.isArray(entry.jira_links) ? entry.jira_links : [];
  jiraCell.appendChild(buildJiraChips(jlinks));

  tbody.appendChild(tr);
}


function esc(str) {
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}


// ── ENTRY COUNT ──────────────────────────────────────────
function updateCount(delta) {
  const el = document.getElementById('entry-count');
  const current = parseInt(el.dataset.count || '0') + delta;
  el.dataset.count = current;
  el.textContent = `${current} ${current === 1 ? 'entry' : 'entries'} logged`;
}


// ── SEARCH / FILTER ──────────────────────────────────────
function filterTable() {
  const q = document.getElementById('search-input').value.toLowerCase().trim();
  const rows = document.querySelectorAll('#today-tbody tr:not(#empty-row)');
  let visible = 0;
  rows.forEach(tr => {
    const nm = (tr.dataset.name || '') + ' ' + (tr.dataset.module || '');
    if (!q || nm.includes(q)) {
      tr.classList.remove('hidden-row');
      visible++;
    } else {
      tr.classList.add('hidden-row');
    }
  });
  // Show no-results hint
  let noRes = document.getElementById('no-results-row');
  if (visible === 0 && q) {
    if (!noRes) {
      noRes = document.createElement('tr');
      noRes.id = 'no-results-row';
      noRes.innerHTML = `<td colspan="8"><div class="empty-state" style="padding:28px 0">
        <span class="empty-icon" style="font-size:22px">🔍</span>
        <p>No entries match "<strong>${esc(q)}</strong>"</p>
      </div></td>`;
      document.getElementById('today-tbody').appendChild(noRes);
    }
  } else {
    if (noRes) noRes.remove();
  }
}


// ── LOAD TODAY ───────────────────────────────────────────
async function loadToday() {
  try {
    const res     = await fetch('/api/today');
    const entries = await res.json();
    const tbody   = document.getElementById('today-tbody');
    tbody.innerHTML = '';
    rowCount = 0;

    if (entries.length === 0) {
      tbody.innerHTML = `
        <tr id="empty-row"><td colspan="7">
          <div class="empty-state">
            <span class="empty-icon">📋</span>
            <p>No entries yet today. Submit your first log above!</p>
          </div>
        </td></tr>`;
    } else {
      entries.forEach(e => appendRow(e, false));
    }

    const count = document.getElementById('entry-count');
    count.dataset.count = entries.length;
    count.textContent   = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} logged`;

    // clear search
    const si = document.getElementById('search-input');
    if (si) si.value = '';
  } catch(e) {
    showToast("Could not load today's entries.", true);
  }
}


// ── DELETE ───────────────────────────────────────────────
async function deleteEntry(id, btn) {
  if (!confirm('Delete this entry?')) return;
  try {
    const res = await fetch(`/api/delete/${id}`, { method: 'DELETE' });
    const d   = await res.json();
    if (d.success) {
      const row = btn.closest('tr');
      row.style.transition = 'opacity .3s,transform .3s';
      row.style.opacity = '0';
      row.style.transform = 'translateX(20px)';
      setTimeout(() => { row.remove(); updateCount(-1); }, 320);
      showToast('Entry deleted.');
    }
  } catch(e) {
    showToast('Could not delete entry.', true);
  }
}


// ── EXPORT CSV ───────────────────────────────────────────
function exportCSV(scope) {
  if (scope === 'today') {
    showToast('⬇ Downloading today\'s entries…');
    window.location.href = '/api/export/csv?scope=today';
  } else if (scope === 'all') {
    // "Download History" — past days only, from /api/export/history
    showToast('⬇ Downloading activity history…');
    window.location.href = '/api/export/history';
  }
}


// ── HISTORY ──────────────────────────────────────────────
let historyLoaded = false;
let historyOpen   = false;

async function toggleHistory() {
  const panel = document.getElementById('history-panel');
  const btn   = document.getElementById('hist-toggle-btn');

  if (historyOpen) {
    panel.classList.add('hidden');
    btn.textContent = 'View History ↓';
    btn.setAttribute('title','View all past entries');
    historyOpen = false;
    return;
  }

  panel.classList.remove('hidden');
  btn.textContent = 'Hide History ↑';
  btn.setAttribute('title','Hide history panel');
  historyOpen = true;
  if (historyLoaded) return;

  try {
    const res     = await fetch('/api/history');
    const grouped = await res.json();
    panel.innerHTML = '';
    const dates = Object.keys(grouped);

    if (!dates.length) {
      panel.innerHTML = '<p style="color:var(--text-3);font-size:13px;padding-top:16px;">No historical data yet — previous days will appear here.</p>';
      historyLoaded = true;
      return;
    }

    dates.forEach(dl => {
      const entries = grouped[dl];
      const group   = document.createElement('div');
      group.className = 'hist-group';
      group.innerHTML = `<div class="hist-date-label">${dl} — ${entries.length} entries</div>`;

      const wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';
      wrapper.appendChild(buildHistTable(entries));
      group.appendChild(wrapper);
      panel.appendChild(group);
    });

    historyLoaded = true;
  } catch(e) {
    panel.innerHTML = '<p style="color:var(--danger);padding-top:16px;">Failed to load history.</p>';
  }
}


function buildHistTable(entries) {
  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `
    <thead><tr>
      <th>S.No.</th><th>Name</th><th>Module Worked</th>
      <th>PR Links</th><th>Jira / NSD Tickets</th><th>No. of Fixes</th><th>Date</th>
    </tr></thead>
    <tbody></tbody>`;
  const tbody = table.querySelector('tbody');
  entries.forEach((e, i) => {
    const tr = document.createElement('tr');
    const links  = Array.isArray(e.pr_links)   ? e.pr_links   : [e.pr_links];
    const jlinks = Array.isArray(e.jira_links)  ? e.jira_links : [];
    tr.innerHTML = `
      <td class="sno-cell">${(i+1).toString().padStart(2,'0')}</td>
      <td class="name-cell">${esc(e.name)}</td>
      <td class="module-cell">${esc(e.module)}</td>
      <td class="pr-cell"></td>
      <td class="jira-cell"></td>
      <td class="fixes-cell"><span class="fixes-badge">${e.num_fixes}</span></td>
      <td class="date-cell">${e.date}</td>`;
    tr.querySelector('.pr-cell').appendChild(buildPrChips(links));
    tr.querySelector('.jira-cell').appendChild(buildJiraChips(jlinks));
    tbody.appendChild(tr);
  });
  return table;
}



// ── FILTER HISTORY ───────────────────────────────────────
function filterHistory() {
  const q = document.getElementById('hist-search-input').value.toLowerCase().trim();
  const rows = document.querySelectorAll('#history-panel .data-table tbody tr');
  rows.forEach(tr => {
    const text = tr.textContent.toLowerCase();
    tr.classList.toggle('hidden-row', q && !text.includes(q));
  });
  // Show/hide date group labels if all their rows are hidden
  document.querySelectorAll('#history-panel .hist-group').forEach(grp => {
    const visible = grp.querySelectorAll('tbody tr:not(.hidden-row)').length;
    grp.style.display = visible === 0 && q ? 'none' : '';
  });
}

// ── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadToday);

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && ['f-module','f-fixes'].includes(e.target.id)) {
    submitEntry();
  }
});
