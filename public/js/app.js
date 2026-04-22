/* ═══════════════════════════════════════
   WeekFlow — app.js
   Cloud Task Sync + Weather
═══════════════════════════════════════ */

let tasks = [];
let currentUser = null;
let activeFilter = 'all';
let lastWeatherCity = '';

const THEME_KEY = 'weekflow_theme';

// ── NETLIFY IDENTITY ───────────────────
const netlifyIdentity = window.netlifyIdentity;

netlifyIdentity.on('init', user => {
  if (user) { currentUser = user; showApp(user); }
});
netlifyIdentity.on('login', user => {
  currentUser = user;
  netlifyIdentity.close();
  showApp(user);
});
netlifyIdentity.on('logout', () => {
  currentUser = null;
  tasks = [];
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
});

document.getElementById('login-btn').addEventListener('click', () => netlifyIdentity.open());
document.getElementById('logout-btn').addEventListener('click', () => netlifyIdentity.logout());

async function showApp(user) {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('user-email').textContent = user.email;
  await loadTasksFromCloud();
  renderWeek();
  renderTasks();
}

// ── THEME ──────────────────────────────
const html = document.documentElement;
const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
html.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

document.getElementById('theme-toggle').addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
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
    if (tab === 'weather' && lastWeatherCity) loadWeather(lastWeatherCity);
  });
});

// ── CLOUD TASK SYNC (Netlify Function) ─
async function getAuthHeader() {
  // Token immer frisch vom Identity-Widget holen
  return new Promise((resolve) => {
    netlifyIdentity.currentUser()?.jwt().then(token => {
      resolve(token ? { 'Authorization': `Bearer ${token}` } : {});
    }).catch(() => resolve({}));
  });
}

async function loadTasksFromCloud() {
  const list = document.getElementById('task-list');
  list.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Lade Aufgaben…</span></div>`;
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/.netlify/functions/tasks', { headers });
    if (!res.ok) throw new Error('Load failed');
    tasks = await res.json();
  } catch {
    tasks = [];
  }
}

async function saveTasksToCloud() {
  try {
    const headers = { 'Content-Type': 'application/json', ...await getAuthHeader() };
    await fetch('/.netlify/functions/tasks', {
      method: 'POST',
      headers,
      body: JSON.stringify(tasks),
    });
  } catch (e) {
    console.error('Cloud save failed:', e);
  }
}

// ── WEEK VIEW ──────────────────────────
function renderWeek() {
  const grid = document.getElementById('week-grid');
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const startStr = monday.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  const endDate = new Date(monday); endDate.setDate(monday.getDate() + 6);
  const endStr = endDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  document.getElementById('week-label').textContent = `${startStr} – ${endStr}`;

  const shorts = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  grid.innerHTML = '';

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
               title="${escHtml(t.title)}" data-id="${t.id}">
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
  if (activeFilter === 'open') filtered = tasks.filter(t => !t.done);
  if (activeFilter === 'done') filtered = tasks.filter(t => t.done);

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">${activeFilter === 'all' ? 'Noch keine Aufgaben. Leg eine an!' : 'Keine Aufgaben hier.'}</div>`;
    return;
  }

  filtered = [...filtered].sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 };
    if (p[a.priority] !== p[b.priority]) return p[a.priority] - p[b.priority];
    if (a.due && b.due) return a.due.localeCompare(b.due);
    return 0;
  });

  list.innerHTML = filtered.map(t => `
    <div class="task-card${t.done ? ' done' : ''}" data-id="${t.id}">
      <div class="task-checkbox${t.done ? ' checked' : ''}" data-id="${t.id}">${t.done ? '✓' : ''}</div>
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
        <button class="icon-btn edit-btn" data-id="${t.id}">✏️</button>
        <button class="icon-btn delete-btn" data-id="${t.id}">🗑️</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.task-checkbox').forEach(cb => cb.addEventListener('click', () => toggleTask(cb.dataset.id)));
  list.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => openEditModal(btn.dataset.id)));
  list.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => deleteTask(btn.dataset.id)));
}

// ── FILTER ─────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderTasks();
  });
});

// ── TASK CRUD ──────────────────────────
async function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    renderTasks(); renderWeek();
    await saveTasksToCloud();
  }
}

async function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  renderTasks(); renderWeek();
  await saveTasksToCloud();
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
  setTimeout(() => document.getElementById('task-title-input').focus(), 100);
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
  setTimeout(() => document.getElementById('task-title-input').focus(), 100);
}

function closeModal() { modal.classList.add('hidden'); }

document.getElementById('save-task-btn').addEventListener('click', async () => {
  const title = document.getElementById('task-title-input').value.trim();
  if (!title) {
    const inp = document.getElementById('task-title-input');
    inp.style.borderColor = 'var(--danger)';
    inp.focus();
    setTimeout(() => inp.style.borderColor = '', 1500);
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

  closeModal();
  renderTasks(); renderWeek();
  await saveTasksToCloud();
});

// ── WEATHER ────────────────────────────
const weatherInput = document.getElementById('weather-city-input');
const weatherContent = document.getElementById('weather-content');

document.getElementById('weather-search-btn').addEventListener('click', () => {
  const city = weatherInput.value.trim();
  if (city) loadWeather(city);
});
weatherInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { const city = weatherInput.value.trim(); if (city) loadWeather(city); }
});
document.getElementById('refresh-weather').addEventListener('click', () => {
  if (lastWeatherCity) loadWeather(lastWeatherCity);
});

async function loadWeather(city) {
  lastWeatherCity = city;
  weatherContent.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Lade Wetter…</span></div>`;
  try {
    const res = await fetch(`/.netlify/functions/weather?city=${encodeURIComponent(city)}`);
    if (!res.ok) throw new Error('Not found');
    const data = await res.json();
    renderWeather(data);
  } catch {
    weatherContent.innerHTML = `<div class="empty-state">⚠️ Stadt nicht gefunden oder API nicht verfügbar.<br><small>Stelle sicher, dass WEATHER_API_KEY in Netlify hinterlegt ist.</small></div>`;
  }
}

function renderWeather(d) {
  const current = d.current;
  const forecast = d.forecast?.forecastday || [];
  const icon = `https:${current.condition.icon}`;

  weatherContent.innerHTML = `
    <div class="weather-current">
      <div class="weather-city-name">${escHtml(d.location.name)}, ${escHtml(d.location.country)}</div>
      <div class="weather-main">
        <img src="${icon}" alt="${escHtml(current.condition.text)}" class="weather-icon-large" />
        <div class="weather-temp">${Math.round(current.temp_c)}°C</div>
      </div>
      <div class="weather-condition">${escHtml(current.condition.text)}</div>
      <div class="weather-details">
        <div class="weather-detail"><span>💧</span><span>${current.humidity}%</span><small>Luftfeuchtigkeit</small></div>
        <div class="weather-detail"><span>💨</span><span>${Math.round(current.wind_kph)} km/h</span><small>Wind</small></div>
        <div class="weather-detail"><span>🌡️</span><span>${Math.round(current.feelslike_c)}°C</span><small>Gefühlt</small></div>
      </div>
    </div>

    ${forecast.length > 0 ? `
    <div class="weather-forecast-title">7-Tage-Vorschau</div>
    <div class="weather-forecast">
      ${forecast.map(day => {
        const date = new Date(day.date);
        const dayName = date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
        return `
          <div class="forecast-card">
            <div class="forecast-day">${dayName}</div>
            <img src="https:${day.day.condition.icon}" alt="${escHtml(day.day.condition.text)}" class="forecast-icon" />
            <div class="forecast-temps">
              <span class="forecast-high">${Math.round(day.day.maxtemp_c)}°</span>
              <span class="forecast-low">${Math.round(day.day.mintemp_c)}°</span>
            </div>
            <div class="forecast-rain">🌧 ${day.day.daily_chance_of_rain}%</div>
          </div>
        `;
      }).join('')}
    </div>` : ''}
  `;
}

// ── HELPERS ────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function priorityLabel(p) {
  return { high: '🔴 Hoch', medium: '🟡 Mittel', low: '🟢 Niedrig' }[p] || p;
}
function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}
