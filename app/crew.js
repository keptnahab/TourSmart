// TourSmart Crew Companion — frontend logic. Vanilla ES module, no framework.
'use strict';

const TOKEN_KEY = 'toursmart_crew_token';

const state = {
  token: localStorage.getItem(TOKEN_KEY) || null,
  user: null,
  view: 'chat',
  users: [],
  online: new Set(),
  messages: [],
  lastMsgId: 0,
  events: [],
  shows: [],
  excursions: [],
  tour: [],
  es: null,
  unread: 0,
};

// ── tiny DOM helpers ──────────────────────────────────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v; // only for trusted static strings
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

function initials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function avatar(user, cls = '') {
  return el('div', { class: `avatar ${cls}`, style: `background:${user.color || '#888'}`, text: initials(user.displayName || user.name) });
}

// ── toast ────────────────────────────────────────────────────────────────
let toastTimer;
function toast(msg, isError = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = isError ? 'show error' : 'show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ''), 3000);
}

// ── API ───────────────────────────────────────────────────────────────────
async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Keine Verbindung zum Server.');
  }
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (res.status === 401 && state.user) {
    // token expired/invalid mid-session
    logout(true);
    throw new Error('Sitzung abgelaufen. Bitte neu anmelden.');
  }
  if (!res.ok) throw new Error((data && data.error) || `Fehler ${res.status}`);
  return data;
}

// ════════════════════════ AUTH GATE ════════════════════════
function setupGate() {
  const tabLogin = $('#tab-login');
  const tabReg = $('#tab-register');
  const loginForm = $('#login-form');
  const regForm = $('#register-form');

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active'); tabReg.classList.remove('active');
    loginForm.classList.remove('hidden'); regForm.classList.add('hidden');
  });
  tabReg.addEventListener('click', () => {
    tabReg.classList.add('active'); tabLogin.classList.remove('active');
    regForm.classList.remove('hidden'); loginForm.classList.add('hidden');
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#login-msg'); msg.className = 'form-msg'; msg.textContent = '';
    const fd = new FormData(loginForm);
    const btn = loginForm.querySelector('button');
    btn.disabled = true;
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: { username: fd.get('username'), password: fd.get('password') },
      });
      onAuth(data);
    } catch (err) {
      msg.className = 'form-msg error'; msg.textContent = err.message;
    } finally { btn.disabled = false; }
  });

  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#register-msg'); msg.className = 'form-msg'; msg.textContent = '';
    const fd = new FormData(regForm);
    const btn = regForm.querySelector('button');
    btn.disabled = true;
    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: {
          username: fd.get('username'),
          displayName: fd.get('displayName'),
          department: fd.get('department') || null,
          password: fd.get('password'),
        },
      });
      onAuth(data);
    } catch (err) {
      msg.className = 'form-msg error'; msg.textContent = err.message;
    } finally { btn.disabled = false; }
  });
}

function onAuth(data) {
  state.token = data.token;
  state.user = data.user;
  localStorage.setItem(TOKEN_KEY, data.token);
  enterApp();
}

function logout(silent = false) {
  if (state.es) { state.es.close(); state.es = null; }
  state.token = null; state.user = null;
  localStorage.removeItem(TOKEN_KEY);
  $('#app').classList.add('hidden');
  $('#gate').classList.remove('hidden');
  if (!silent) toast('Abgemeldet.');
}

// ════════════════════════ APP ════════════════════════
async function enterApp() {
  $('#gate').classList.add('hidden');
  $('#app').classList.remove('hidden');
  renderUserChip();
  connectStream();
  // Load everything in parallel; surface failures but don't block the others.
  await Promise.allSettled([loadUsers(), loadMessages(), loadEvents(), loadExcursions()]);
  showView(state.view);
}

function renderUserChip() {
  const chip = $('#user-chip');
  chip.replaceChildren(
    avatar(state.user),
    el('div', {},
      el('div', { class: 'name', text: state.user.displayName }),
      el('div', { class: 'role', text: state.user.role === 'admin' ? 'Admin' : (state.user.department || 'Crew') })
    )
  );
}

// ── view switching ──
function setupNav() {
  $$('#nav-tabs button, #mobile-nav button').forEach((b) => {
    b.addEventListener('click', () => showView(b.dataset.view));
  });
  $('#logout-btn').addEventListener('click', () => logout());
}

function showView(view) {
  state.view = view;
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));
  $$('#nav-tabs button, #mobile-nav button').forEach((b) =>
    b.classList.toggle('active', b.dataset.view === view)
  );
  if (view === 'chat') {
    state.unread = 0;
    updateChatBadge();
    scrollChatToBottom();
    $('#chat-input').focus();
  }
  // Refresh on open so additions from other crew members show without a reload.
  // (Chat stays live via SSE; these three are pull-on-demand.)
  if (view === 'roster') loadUsers().catch(() => {});
  if (view === 'calendar') loadEvents().catch(() => {});
  if (view === 'excursions') loadExcursions().catch(() => {});
}

// ════════════════════════ CHAT ════════════════════════
async function loadMessages() {
  const data = await api('/api/messages?limit=100');
  state.messages = data.messages;
  state.lastMsgId = state.messages.length ? state.messages[state.messages.length - 1].id : 0;
  renderMessages();
}

function dayLabel(ts) {
  const d = new Date(ts);
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Heute';
  if (same(d, y)) return 'Gestern';
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' });
}

function timeLabel(ts) {
  return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function renderMessages() {
  const scroll = $('#chat-scroll');
  const nearBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 80;
  scroll.replaceChildren();
  let lastDay = null;
  let prev = null;
  for (const m of state.messages) {
    const day = dayLabel(m.createdAt);
    if (day !== lastDay) {
      scroll.append(el('div', { class: 'day-sep', text: day }));
      lastDay = day; prev = null;
    }
    const grouped = prev && prev.user.id === m.user.id && m.createdAt - prev.createdAt < 5 * 60 * 1000;
    scroll.append(
      el('div', { class: `msg${grouped ? ' grouped' : ''}` },
        avatar(m.user),
        el('div', { class: 'msg-body' },
          el('div', { class: 'msg-meta' },
            el('span', { class: 'who', text: m.user.displayName, style: `color:${m.user.color}` }),
            el('span', { class: 'when', text: timeLabel(m.createdAt) })
          ),
          el('div', { class: 'msg-text', text: m.body })
        )
      )
    );
    prev = m;
  }
  if (nearBottom) scrollChatToBottom();
}

function scrollChatToBottom() {
  const scroll = $('#chat-scroll');
  requestAnimationFrame(() => { scroll.scrollTop = scroll.scrollHeight; });
}

function appendMessage(m) {
  if (state.messages.some((x) => x.id === m.id)) return; // de-dupe (own echo)
  state.messages.push(m);
  if (m.id > state.lastMsgId) state.lastMsgId = m.id;
  renderMessages();
  if (state.view !== 'chat' && m.user.id !== state.user.id) {
    state.unread += 1;
    updateChatBadge();
  }
}

function updateChatBadge() {
  const badge = $('#chat-badge');
  if (state.unread > 0) { badge.textContent = state.unread; badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');
}

function setupChat() {
  const form = $('#chat-form');
  const input = $('#chat-input');
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = input.value.trim();
    if (!body) return;
    input.value = ''; input.style.height = 'auto';
    try {
      const data = await api('/api/messages', { method: 'POST', body: { body } });
      appendMessage(data.message);
    } catch (err) {
      toast(err.message, true);
      input.value = body; // restore on failure
    }
  });
}

// ════════════════════════ PRESENCE / SSE ════════════════════════
function connectStream() {
  if (state.es) state.es.close();
  const es = new EventSource(`/api/stream?token=${encodeURIComponent(state.token)}`);
  state.es = es;
  es.addEventListener('message', (e) => {
    try { appendMessage(JSON.parse(e.data)); } catch {}
  });
  es.addEventListener('presence', (e) => {
    try {
      const { online } = JSON.parse(e.data);
      state.online = new Set(online);
      updatePresence();
      if (state.view === 'roster') renderRoster();
    } catch {}
  });
  // On every (re)connect, pull anything posted while we weren't subscribed —
  // closes the initial GET↔subscribe race and any reconnect gap. EventSource
  // reconnects automatically on error; 'open' fires each time.
  es.addEventListener('open', () => { syncMessages().catch(() => {}); });
  es.onerror = () => { /* EventSource auto-reconnects */ };
}

async function syncMessages() {
  const data = await api(`/api/messages?since=${state.lastMsgId}&limit=200`);
  for (const m of data.messages) appendMessage(m);
}

function updatePresence() {
  const n = state.online.size;
  $('#presence-count').textContent = `${n} online`;
}

// ════════════════════════ ROSTER ════════════════════════
async function loadUsers() {
  const data = await api('/api/users');
  state.users = data.users;
  state.online = new Set(data.online);
  updatePresence();
  renderRoster();
}

function renderRoster() {
  const scroll = $('#roster-scroll');
  const online = state.users.filter((u) => state.online.has(u.id)).length;
  $('#roster-sub').textContent = `${state.users.length} Crew · ${online} online`;
  scroll.replaceChildren();
  const grid = el('div', { class: 'roster-grid' });
  for (const u of state.users) {
    const isOnline = state.online.has(u.id);
    grid.append(
      el('div', { class: 'roster-card' },
        avatar(u),
        el('div', { style: 'flex:1;min-width:0' },
          el('div', { class: 'r-name', text: u.displayName + (u.id === state.user.id ? ' (du)' : '') }),
          el('div', { class: 'r-dept', text: u.role === 'admin' ? 'Admin · ' + (u.department || 'Crew') : (u.department || 'Crew') })
        ),
        el('span', { class: `dot ${isOnline ? 'online' : ''}`, title: isOnline ? 'online' : 'offline' })
      )
    );
  }
  scroll.append(grid);
}

// ════════════════════════ CALENDAR ════════════════════════
async function loadEvents() {
  const data = await api('/api/events');
  state.events = data.events;
  state.shows = data.shows;
  if (!state.tour.length) state.tour = state.shows.map((s) => ({ n: s.n, city: s.city }));
  renderCalendar();
}

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    d: d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' }),
    wd: d.toLocaleDateString('de-DE', { weekday: 'long' }),
  };
}

function renderCalendar() {
  const scroll = $('#cal-scroll');
  scroll.replaceChildren();

  // Merge shows + day-offs + crew events into one date-sorted list.
  const items = [];
  for (const s of state.shows) {
    items.push({ kind: 'show', date: s.date, data: s });
    if (s.dayOff) items.push({ kind: 'dayoff', date: s.dayOff, data: s });
  }
  for (const ev of state.events) items.push({ kind: 'event', date: ev.date, data: ev });
  items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (!items.length) { scroll.append(emptyState('📅', 'Noch keine Termine.')); return; }

  let lastDate = null;
  let dayWrap = null;
  for (const it of items) {
    if (it.date !== lastDate) {
      const f = fmtDate(it.date);
      dayWrap = el('div', { class: 'cal-day' },
        el('div', { class: 'cal-day-head' },
          el('span', { class: 'd', text: f.d }),
          el('span', { class: 'wd', text: f.wd })
        )
      );
      scroll.append(dayWrap);
      lastDate = it.date;
    }
    dayWrap.append(calCard(it));
  }
}

function calCard(it) {
  if (it.kind === 'show') {
    const s = it.data;
    return el('div', { class: 'card show' },
      el('div', { class: 'card-top' },
        el('div', { class: 'card-title', text: `${s.city} — Show` }),
        el('div', { class: 'card-time', text: `Doors ${s.doors} · AC/DC ${s.acdc}` })
      ),
      el('div', { class: 'card-sub', text: s.venue }),
      el('div', { class: 'card-foot' }, el('span', { class: 'pill red', text: `Show ${String(s.n).padStart(2, '0')}` }))
    );
  }
  if (it.kind === 'dayoff') {
    const s = it.data;
    return el('div', { class: 'card dayoff' },
      el('div', { class: 'card-top' },
        el('div', { class: 'card-title', text: 'Tag frei' }),
        el('div', { class: 'card-time', text: s.city })
      ),
      el('div', { class: 'card-foot' }, el('span', { class: 'pill gold', text: 'Day Off' }))
    );
  }
  // crew event
  const ev = it.data;
  const canDelete = ev.createdBy === state.user.id || state.user.role === 'admin';
  const card = el('div', { class: 'card event' },
    el('div', { class: 'card-top' },
      el('div', { class: 'card-title', text: ev.title }),
      ev.startTime ? el('div', { class: 'card-time', text: ev.endTime ? `${ev.startTime}–${ev.endTime}` : ev.startTime }) : null
    ),
    ev.location ? el('div', { class: 'card-sub', text: '📍 ' + ev.location }) : null,
    ev.description ? el('div', { class: 'card-desc', text: ev.description }) : null,
    el('div', { class: 'card-foot' },
      ev.city ? el('span', { class: 'pill red', text: ev.city.name }) : null,
      el('span', { text: 'von ' + ev.creator.name }),
      canDelete ? deleteLink(() => deleteEvent(ev.id)) : null
    )
  );
  return card;
}

function deleteLink(onClick) {
  return el('button', {
    class: 'pill', style: 'cursor:pointer;background:none', text: 'löschen', onclick: onClick,
  });
}

async function deleteEvent(id) {
  if (!confirm('Diesen Termin löschen?')) return;
  try {
    await api(`/api/events/${id}`, { method: 'DELETE' });
    state.events = state.events.filter((e) => e.id !== id);
    renderCalendar();
    toast('Termin gelöscht.');
  } catch (err) { toast(err.message, true); }
}

// ════════════════════════ EXCURSIONS ════════════════════════
async function loadExcursions() {
  const data = await api('/api/excursions');
  state.excursions = data.excursions;
  renderExcursions();
}

function renderExcursions() {
  const scroll = $('#ex-scroll');
  scroll.replaceChildren();
  if (!state.excursions.length) {
    scroll.append(emptyState('🧭', 'Noch keine Ausflüge geplant. Leg den ersten an!'));
    return;
  }
  const grid = el('div', { class: 'ex-grid' });
  for (const ex of state.excursions) grid.append(exCard(ex));
  scroll.append(grid);
}

function exCard(ex) {
  const myStatus = (ex.rsvps.find((r) => r.userId === state.user.id) || {}).status || null;
  const f = fmtDate(ex.date);
  const canDelete = ex.createdBy === state.user.id || state.user.role === 'admin';

  const meta = el('div', { class: 'ex-meta' },
    el('div', { text: `📅 ${f.wd}, ${f.d}${ex.time ? ' · ' + ex.time : ''}` }),
    ex.meetingPoint ? el('div', { text: '📍 Treffpunkt: ' + ex.meetingPoint }) : null,
    ex.location ? el('div', { text: '🎯 ' + ex.location }) : null
  );

  const spots = ex.capacity != null
    ? el('div', { class: 'ex-spots' },
        ex.spotsLeft > 0
          ? el('span', { class: 'open', text: `${ex.goingCount}/${ex.capacity} dabei · ${ex.spotsLeft} frei` })
          : el('span', { class: 'full', text: `Voll (${ex.goingCount}/${ex.capacity})` })
      )
    : el('div', { class: 'ex-spots', text: `${ex.goingCount} dabei` });

  const roster = el('div', { class: 'roster-mini' });
  for (const r of ex.rsvps) {
    if (r.status === 'out') continue;
    roster.append(avatar({ displayName: r.displayName, color: r.color }, r.status === 'maybe' ? 'maybe' : ''));
  }

  const mkBtn = (label, status, cls) => el('button', {
    class: `btn sm ${cls} rsvp-btn${myStatus === status ? ' active' : ''}`,
    text: label,
    onclick: () => rsvp(ex.id, myStatus === status && status !== 'out' ? 'out' : status),
  });

  return el('div', { class: 'ex-card' },
    ex.city ? el('div', { class: 'ex-city', text: ex.city.name }) : el('div', { class: 'ex-city', text: 'Tour' }),
    el('div', { class: 'ex-title', text: ex.title }),
    meta,
    ex.description ? el('div', { class: 'ex-desc', text: ex.description }) : null,
    spots,
    roster,
    el('div', { class: 'ex-actions' },
      mkBtn('Dabei', 'going', 'gold'),
      mkBtn('Vielleicht', 'maybe', 'ghost'),
      canDelete ? el('button', { class: 'btn ghost sm', text: '🗑', title: 'Löschen', onclick: () => deleteExcursion(ex.id) }) : null
    )
  );
}

async function rsvp(id, status) {
  try {
    const data = await api(`/api/excursions/${id}/rsvp`, { method: 'POST', body: { status } });
    const idx = state.excursions.findIndex((e) => e.id === id);
    if (idx >= 0) state.excursions[idx] = data.excursion;
    renderExcursions();
  } catch (err) { toast(err.message, true); }
}

async function deleteExcursion(id) {
  if (!confirm('Diesen Ausflug löschen?')) return;
  try {
    await api(`/api/excursions/${id}`, { method: 'DELETE' });
    state.excursions = state.excursions.filter((e) => e.id !== id);
    renderExcursions();
    toast('Ausflug gelöscht.');
  } catch (err) { toast(err.message, true); }
}

// ════════════════════════ MODALS ════════════════════════
function openModal(node) {
  const root = $('#modal-root');
  const backdrop = el('div', { class: 'modal-backdrop' });
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
  backdrop.append(node);
  root.replaceChildren(backdrop);
  document.addEventListener('keydown', escClose);
  const first = node.querySelector('input, textarea, select');
  if (first) first.focus();
}
function closeModal() {
  $('#modal-root').replaceChildren();
  document.removeEventListener('keydown', escClose);
}
function escClose(e) { if (e.key === 'Escape') closeModal(); }

function cityOptions(selectedN) {
  const opts = [el('option', { value: '', text: '— keine Stadt —' })];
  for (const s of state.shows) {
    opts.push(el('option', { value: String(s.n), text: `${String(s.n).padStart(2, '0')} · ${s.city} (${s.date})`, ...(String(s.n) === String(selectedN) ? { selected: true } : {}) }));
  }
  return opts;
}

function eventModal() {
  const form = el('form');
  form.append(
    el('h3', { text: 'Neuer Termin' }),
    field('Titel', el('input', { name: 'title', maxlength: '120', required: true, placeholder: 'z. B. Crew-Dinner' })),
    fieldRow(
      field('Datum', el('input', { name: 'date', type: 'date', required: true })),
      field('Von', el('input', { name: 'startTime', type: 'time' }))
    ),
    fieldRow(
      field('Bis', el('input', { name: 'endTime', type: 'time' })),
      field('Stadt', el('select', { name: 'cityN' }, ...cityOptions()))
    ),
    field('Ort', el('input', { name: 'location', maxlength: '200', placeholder: 'optional' })),
    field('Notiz', el('textarea', { name: 'description', maxlength: '2000', placeholder: 'optional' })),
    el('div', { class: 'form-msg error', id: 'modal-msg' }),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn ghost', type: 'button', text: 'Abbrechen', onclick: closeModal }),
      el('button', { class: 'btn gold', type: 'submit', text: 'Speichern' })
    )
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = {
      title: fd.get('title'),
      date: fd.get('date'),
      startTime: fd.get('startTime') || null,
      endTime: fd.get('endTime') || null,
      location: fd.get('location') || null,
      description: fd.get('description') || null,
      cityN: fd.get('cityN') ? Number(fd.get('cityN')) : null,
    };
    try {
      const data = await api('/api/events', { method: 'POST', body });
      state.events.push(data.event);
      renderCalendar();
      closeModal();
      toast('Termin angelegt.');
    } catch (err) { $('#modal-msg').textContent = err.message; }
  });
  return el('div', { class: 'modal' }, form);
}

function excursionModal() {
  const form = el('form');
  form.append(
    el('h3', { text: 'Neuer Ausflug' }),
    field('Titel', el('input', { name: 'title', maxlength: '120', required: true, placeholder: 'z. B. Hoover Dam Tour' })),
    field('Stadt', el('select', { name: 'cityN' }, ...cityOptions())),
    fieldRow(
      field('Datum', el('input', { name: 'date', type: 'date', required: true })),
      field('Uhrzeit', el('input', { name: 'time', type: 'time' }))
    ),
    fieldRow(
      field('Treffpunkt', el('input', { name: 'meetingPoint', maxlength: '200', placeholder: 'z. B. Hotel-Lobby' })),
      field('Max. Plätze', el('input', { name: 'capacity', type: 'number', min: '1', placeholder: '∞' }))
    ),
    field('Ziel / Ort', el('input', { name: 'location', maxlength: '200', placeholder: 'optional' })),
    field('Beschreibung', el('textarea', { name: 'description', maxlength: '2000', placeholder: 'optional' })),
    el('div', { class: 'form-msg error', id: 'modal-msg' }),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn ghost', type: 'button', text: 'Abbrechen', onclick: closeModal }),
      el('button', { class: 'btn gold', type: 'submit', text: 'Anlegen' })
    )
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = {
      title: fd.get('title'),
      date: fd.get('date'),
      time: fd.get('time') || null,
      meetingPoint: fd.get('meetingPoint') || null,
      location: fd.get('location') || null,
      description: fd.get('description') || null,
      cityN: fd.get('cityN') ? Number(fd.get('cityN')) : null,
      capacity: fd.get('capacity') ? Number(fd.get('capacity')) : null,
    };
    try {
      const data = await api('/api/excursions', { method: 'POST', body });
      state.excursions.push(data.excursion);
      renderExcursions();
      closeModal();
      toast('Ausflug angelegt.');
    } catch (err) { $('#modal-msg').textContent = err.message; }
  });
  return el('div', { class: 'modal' }, form);
}

function field(label, input) {
  return el('div', { class: 'field' }, el('label', { text: label }), input);
}
function fieldRow(...fields) {
  return el('div', { class: 'field-row' }, ...fields);
}
function emptyState(icon, text) {
  return el('div', { class: 'empty' }, el('div', { class: 'big', text: icon }), el('div', { text }));
}

// ════════════════════════ BOOT ════════════════════════
function setupActions() {
  $('#new-event-btn').addEventListener('click', () => openModal(eventModal()));
  $('#fab-event').addEventListener('click', () => openModal(eventModal()));
  $('#new-ex-btn').addEventListener('click', () => openModal(excursionModal()));
  $('#fab-ex').addEventListener('click', () => openModal(excursionModal()));
}

async function boot() {
  setupGate();
  setupNav();
  setupChat();
  setupActions();

  if (state.token) {
    try {
      const data = await api('/api/me');
      state.user = data.user;
      await enterApp();
      return;
    } catch {
      // token invalid → fall through to gate
      state.token = null;
      localStorage.removeItem(TOKEN_KEY);
    }
  }
  $('#gate').classList.remove('hidden');
}

boot();
