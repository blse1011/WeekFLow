/* ═══════════════════════════════════════
   WeekFlow — app.js
   Task Manager + Week View + Bets
═══════════════════════════════════════ */

// ── STATE ──────────────────────────────
let tasks = [];
let currentUser = null;
let activeFiler = 'all';

const STORAGE_KEY = 'weekflow_tasks';
const THEME_KEY   = 'weekflow_theme';

// ── NETLIFY IDENTITY ───────────────────
const netlifyIdentity = window.netlifyIdentity;

netlifyIdentity.on('init', user => {
  if (user) {
    currentUser = user;
    showApp(user);
  }
});

netlifyIdentity.on('login', user => {
  currentUser = user;
  netlifyIdentity.close();
  showApp(user);
});

netlifyIdentity.on('logout', () => {
  currentUser = null;
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  tasks = [];
});

document.getElementById('login-btn').addEventListener('click', () => {
  netlifyIdentity.open();
});

document.getElementById('logout-btn').addEventListener('click', () => {
  netlifyIdentity.logout();
});

function showApp(user) {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('user-email').textContent = user.email;
  loadTasks();
  renderWeek();
  renderTasks();
}

// ── THEME ──────────────────────────────
const html = document.documentElement;
const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
html.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  updateThemeIcon(next);
});

function updateThemeIcon(theme) {
  document.getElementById('icon-sun').classList.toggle('hidden', theme === 'dark');
  document.getElementById('icon-moon').classList.toggle('hidden', theme === 'light');
}

// ── TABS ───────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
    if (tab === 'bets') loadBets();
  });
});

// ── TASK STORAGE ───────────────────────
function storageKey() {
  return currentUser ? `${STORAGE_KEY}_${currentUser.id}` : STORAGE_KEY;
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(storageKey());
    tasks = raw ? JSON.parse(raw) : [];
  } catch { tasks = []; }
}

function saveTasks() {
  localStorage.setItem(storageKey(), JSON.stringify(tasks));
}

// ── WEEK VIEW ──────────────────────────
const DAY_NAMES = ['So','Mo','Di','Mi','Do','Fr','Sa'];
const DAY_FULL  = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];

function renderWeek() {
  const grid = document.getElementById('week-grid');
  const today = new Date();
  // Start on Monday of current week
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const startStr = monday.toLocaleDateString('de-DE', { day:'2-digit', month:'short' });
  const endDate = new Date(monday); endDate.setDate(monday.getDate() + 6);
  const endStr = endDate.toLocaleDateString('de-DE', { day:'2-digit', month:'short' });
  document.getElementById('week-label').textContent = `${startStr} – ${endStr}`;

  grid.innerHTML = '';
  const shorts = ['Mo','Di','Mi','Do','Fr','Sa','So'];

  weekDays.forEach((date, i) => {
    const isToday = date.toDateString() === today.toDateString();
    const dayShort = shorts[i];
    const dayTasks = tasks.filter(t => t.day === dayShort);

    const col = document.createElement('div');
    col.className = `day-col${isToday ? ' today' : ''}`;
    col.innerHTML = `
      <div class="day-header">
        <div class="day-name">${dayShort}</div>
        <div class="day-num">${date.getDate()}</div>
      </div>
      <div class="day-tasks">
        ${dayTasks.map(t => `
          <div class="day-task-chip priority-${t.priority}${t.done ? ' done' : ''}"
               title="${escHtml(t.title)}"
               data-id="${t.id}">
            ${escHtml(t.title)}
          </div>
        `).join('')}
      </div>
    `;
    col.querySelectorAll('.day-task-chip').forEach(chip => {
      chip.addEventListener('click', () => openEditModal(chip.dataset.id));
    });
    grid.appendChild(col);
  });
}

// ── TASK LIST ──────────────────────────
function renderTasks() {
  const list = document.getElementById('task-list');
  let filtered = tasks;
  if (activeFiler === 'open') filtered = tasks.filter(t => !t.done);
  if (activeFiler === 'done') filtered = tasks.filter(t => t.done);

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">${activeFiler === 'all' ? 'Noch keine Aufgaben. Leg eine an!' : 'Keine Aufgaben hier.'}</div>`;
    return;
  }

  // Sort: high priority first, then by due date
  filtered = [...filtered].sort((a, b) => {
    const pOrder = { high: 0, medium: 1, low: 2 };
    if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
    if (a.due && b.due) return a.due.localeCompare(b.due);
    return 0;
  });

  list.innerHTML = filtered.map(t => `
    <div class="task-card${t.done ? ' done' : ''}" data-id="${t.id}">
      <div class="task-checkbox${t.done ? ' checked' : ''}" data-id="${t.id}">
        ${t.done ? '✓' : ''}
      </div>
      <div class="task-body">
        <div class="task-title-text">${escHtml(t.title)}</div>
        <div class="task-meta">
          <span class="priority-badge ${t.priority}">${priorityLabel(t.priority)}</span>
          ${t.day ? `<span>📅 ${t.day}</span>` : ''}
          ${t.due ? `<span>⏰ ${formatDate(t.due)}</span>` : ''}
        </div>
        ${t.desc ? `<div style="font-size:.82rem;color:var(--text-muted);margin-top:4px">${escHtml(t.desc)}</div>` : ''}
      </div>
      <div class="task-actions">
        <button class="icon-btn edit-btn" data-id="${t.id}" title="Bearbeiten">✏️</button>
        <button class="icon-btn delete-btn" data-id="${t.id}" title="Löschen">🗑️</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.task-checkbox').forEach(cb => {
    cb.addEventListener('click', () => toggleTask(cb.dataset.id));
  });
  list.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });
  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteTask(btn.dataset.id));
  });
}

// ── FILTER ─────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFiler = btn.dataset.filter;
    renderTasks();
  });
});

// ── TASK CRUD ──────────────────────────
function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) { task.done = !task.done; saveTasks(); renderTasks(); renderWeek(); }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks(); renderTasks(); renderWeek();
}

// ── MODAL ──────────────────────────────
const modal = document.getElementById('task-modal');

document.getElementById('open-add-modal').addEventListener('click', openAddModal);
document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('cancel-modal').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

function openAddModal() {
  document.getElementById('modal-title').textContent = 'Neue Aufgabe';
  document.getElementById('task-edit-id').value = '';
  document.getElementById('task-title-input').value = '';
  document.getElementById('task-desc-input').value = '';
  document.getElementById('task-priority-input').value = 'medium';
  document.getElementById('task-day-input').value = '';
  document.getElementById('task-due-input').value = '';
  modal.classList.remove('hidden');
  document.getElementById('task-title-input').focus();
}

function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  document.getElementById('modal-title').textContent = 'Aufgabe bearbeiten';
  document.getElementById('task-edit-id').value = task.id;
  document.getElementById('task-title-input').value = task.title;
  document.getElementById('task-desc-input').value = task.desc || '';
  document.getElementById('task-priority-input').value = task.priority;
  document.getElementById('task-day-input').value = task.day || '';
  document.getElementById('task-due-input').value = task.due || '';
  modal.classList.remove('hidden');
  document.getElementById('task-title-input').focus();
}

function closeModal() {
  modal.classList.add('hidden');
}

document.getElementById('save-task-btn').addEventListener('click', () => {
  const title = document.getElementById('task-title-input').value.trim();
  if (!title) {
    document.getElementById('task-title-input').focus();
    document.getElementById('task-title-input').style.borderColor = 'var(--danger)';
    setTimeout(() => document.getElementById('task-title-input').style.borderColor = '', 1500);
    return;
  }
  const editId = document.getElementById('task-edit-id').value;
  const taskData = {
    title,
    desc:     document.getElementById('task-desc-input').value.trim(),
    priority: document.getElementById('task-priority-input').value,
    day:      document.getElementById('task-day-input').value,
    due:      document.getElementById('task-due-input').value,
  };

  if (editId) {
    const idx = tasks.findIndex(t => t.id === editId);
    if (idx !== -1) tasks[idx] = { ...tasks[idx], ...taskData };
  } else {
    tasks.push({ id: crypto.randomUUID(), done: false, createdAt: Date.now(), ...taskData });
  }

  saveTasks(); renderTasks(); renderWeek(); closeModal();
});

// ── BETS ───────────────────────────────
async function loadBets() {
  const list = document.getElementById('bets-list');
  list.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Lade Quoten…</span></div>`;
  try {
    const res = await fetch('/.netlify/functions/odds');
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    renderBets(data);
  } catch (err) {
    list.innerHTML = `<div class="empty-state">⚠️ Quoten konnten nicht geladen werden.<br><small>Stelle sicher, dass die Netlify Function läuft und ein API-Key hinterlegt ist.</small></div>`;
  }
}

function renderBets(games) {
  const list = document.getElementById('bets-list');
  if (!games || games.length === 0) {
    list.innerHTML = `<div class="empty-state">Keine aktuellen Spiele gefunden.</div>`;
    return;
  }
  list.innerHTML = games.slice(0, 12).map(game => {
    const odds = (game.bookmakers?.[0]?.markets?.[0]?.outcomes || []).slice(0, 3);
    const time = new Date(game.commence_time).toLocaleString('de-DE', { weekday:'short', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
    return `
      <div class="bet-card">
        <div class="bet-sport">${game.sport_title || game.sport_key}</div>
        <div class="bet-title">${escHtml(game.home_team)} vs. ${escHtml(game.away_team)}</div>
        <div class="bet-time">🕐 ${time}</div>
        <div class="bet-odds">
          ${odds.map(o => `
            <button class="odd-btn" onclick="this.classList.toggle('selected')">
              <span class="odd-label">${escHtml(o.name)}</span>
              <span class="odd-value">${o.price.toFixed(2)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('refresh-bets').addEventListener('click', loadBets);

// ── HELPERS ────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function priorityLabel(p) {
  return { high: '🔴 Hoch', medium: '🟡 Mittel', low: '🟢 Niedrig' }[p] || p;
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}
