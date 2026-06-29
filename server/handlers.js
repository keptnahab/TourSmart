// All REST handlers (auth, users, chat, calendar, excursions). No external deps.
import { db, tourStops, cityByN } from './db.js';
import { hashPassword, verifyPassword, issueToken } from './auth.js';
import { broadcast, onlineUserIds } from './sse.js';
import { sendJson, sendError, str, isDate, optTime, optInt } from './http-util.js';

const now = () => Date.now();
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,30}$/;
const PALETTE = ['#d4262a', '#e8b53a', '#4a9d6e', '#3f7fd6', '#b25fd0', '#e07b39', '#3fb0c0', '#c0556b'];

// ── tiny in-memory login rate limiter (per username+ip) ──────────────────
const attempts = new Map();
function rateLimited(key) {
  const rec = attempts.get(key);
  const t = now();
  if (rec && rec.until > t) return true;
  return false;
}
function recordFail(key) {
  const rec = attempts.get(key) || { count: 0, until: 0 };
  rec.count += 1;
  if (rec.count >= 5) {
    rec.until = now() + 60_000; // 1 min lockout after 5 fails
    rec.count = 0;
  }
  attempts.set(key, rec);
}
function clearFails(key) {
  attempts.delete(key);
}

// ── shared prepared statements ───────────────────────────────────────────
const q = {
  userByName: db.prepare('SELECT * FROM users WHERE username = ?'),
  insertUser: db.prepare(
    `INSERT INTO users (username, display_name, role, department, color, pw_hash, pw_salt, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ),
  countUsers: db.prepare('SELECT COUNT(*) AS c FROM users'),
  publicUser: db.prepare(
    'SELECT id, username, display_name, role, department, color, created_at FROM users WHERE id = ?'
  ),
  allUsers: db.prepare(
    'SELECT id, username, display_name, role, department, color, created_at FROM users ORDER BY display_name COLLATE NOCASE'
  ),
};

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    department: row.department,
    color: row.color,
    createdAt: row.created_at,
  };
}

// ════════════════════════════ AUTH ══════════════════════════════════════
export async function register(req, res, { body }) {
  const username = str(body.username, { min: 3, max: 30 });
  const displayName = str(body.displayName, { min: 1, max: 40 });
  const password = typeof body.password === 'string' ? body.password : null;
  // department is optional; an empty value means "none". If provided, it must be valid.
  const deptRaw = body.department == null ? '' : body.department;
  const department = str(deptRaw, { max: 40 }); // null only if over-length / non-string

  if (!username || !USERNAME_RE.test(username)) {
    return sendError(res, 400, 'Username: 3–30 Zeichen, nur Buchstaben/Zahlen/._-');
  }
  if (!displayName) return sendError(res, 400, 'Anzeigename fehlt (1–40 Zeichen).');
  if (department === null) return sendError(res, 400, 'Abteilung zu lang (max. 40 Zeichen).');
  if (!password || password.length < 8 || password.length > 200) {
    return sendError(res, 400, 'Passwort: mindestens 8 Zeichen.');
  }

  if (q.userByName.get(username.toLowerCase())) {
    return sendError(res, 409, 'Username ist bereits vergeben.');
  }

  const { hash, salt } = hashPassword(password);
  const userCount = q.countUsers.get().c;
  const role = userCount === 0 ? 'admin' : 'crew'; // first registrant = admin
  const color = PALETTE[userCount % PALETTE.length];

  const info = q.insertUser.run(
    username.toLowerCase(),
    displayName,
    role,
    department || null,
    color,
    hash,
    salt,
    now()
  );
  const user = q.publicUser.get(info.lastInsertRowid);
  const token = issueToken(user.id);
  return sendJson(res, 201, { token, user: publicUser(user) });
}

export async function login(req, res, { body, ip }) {
  const username = str(body.username, { min: 1, max: 60 });
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password) return sendError(res, 400, 'Username und Passwort erforderlich.');

  const key = `${ip}:${username.toLowerCase()}`;
  if (rateLimited(key)) {
    return sendError(res, 429, 'Zu viele Versuche. Bitte kurz warten.');
  }

  const row = q.userByName.get(username.toLowerCase());
  // Always run a verify-shaped path to reduce username-enumeration timing.
  const ok = row ? verifyPassword(password, row.pw_salt, row.pw_hash) : false;
  if (!ok) {
    recordFail(key);
    return sendError(res, 401, 'Username oder Passwort falsch.');
  }
  clearFails(key);
  const token = issueToken(row.id);
  return sendJson(res, 200, { token, user: publicUser(row) });
}

export async function me(req, res, { user }) {
  return sendJson(res, 200, { user: publicUser(user) });
}

export async function updateMe(req, res, { user, body }) {
  const fields = {};
  if (body.displayName !== undefined) {
    const dn = str(body.displayName, { min: 1, max: 40 });
    if (!dn) return sendError(res, 400, 'Anzeigename: 1–40 Zeichen.');
    fields.display_name = dn;
  }
  if (body.department !== undefined) {
    const d = body.department === null ? null : str(body.department, { max: 40 });
    if (d === null && body.department !== null && body.department !== '') {
      return sendError(res, 400, 'Abteilung zu lang.');
    }
    fields.department = d || null;
  }
  if (body.color !== undefined) {
    if (typeof body.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(body.color)) {
      return sendError(res, 400, 'Farbe muss ein Hex-Wert sein (#rrggbb).');
    }
    fields.color = body.color;
  }
  const keys = Object.keys(fields);
  if (keys.length === 0) return sendError(res, 400, 'Nichts zu ändern.');
  const set = keys.map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE users SET ${set} WHERE id = ?`).run(...keys.map((k) => fields[k]), user.id);
  return sendJson(res, 200, { user: publicUser(q.publicUser.get(user.id)) });
}

// ════════════════════════════ USERS / ROSTER ════════════════════════════
export async function listUsers(req, res) {
  const online = new Set(onlineUserIds());
  const rows = q.allUsers.all().map((r) => ({ ...publicUser(r), online: online.has(r.id) }));
  return sendJson(res, 200, { users: rows, online: [...online] });
}

// ════════════════════════════ TOUR (reference) ══════════════════════════
export async function listTour(req, res) {
  return sendJson(res, 200, { stops: tourStops() });
}

// ════════════════════════════ CHAT ══════════════════════════════════════
const chatQ = {
  insert: db.prepare('INSERT INTO messages (channel, user_id, body, created_at) VALUES (?, ?, ?, ?)'),
  recent: db.prepare(
    `SELECT m.id, m.channel, m.body, m.created_at, m.user_id,
            u.display_name, u.color
     FROM messages m JOIN users u ON u.id = m.user_id
     WHERE m.channel = ? AND m.id > ?
     ORDER BY m.id DESC LIMIT ?`
  ),
};

function shapeMessage(r) {
  return {
    id: r.id,
    channel: r.channel,
    body: r.body,
    createdAt: r.created_at,
    user: { id: r.user_id, displayName: r.display_name, color: r.color },
  };
}

export async function listMessages(req, res, { query }) {
  const channel = str(query.channel, { max: 40 }) || 'crew';
  const since = Number(query.since) || 0;
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
  const rows = chatQ.recent.all(channel, since, limit).map(shapeMessage).reverse();
  return sendJson(res, 200, { messages: rows });
}

export async function postMessage(req, res, { user, body }) {
  const text = str(body.body, { min: 1, max: 2000 });
  const channel = str(body.channel, { max: 40 }) || 'crew';
  if (!text) return sendError(res, 400, 'Nachricht ist leer.');
  const info = chatQ.insert.run(channel, user.id, text, now());
  const msg = shapeMessage({
    id: info.lastInsertRowid,
    channel,
    body: text,
    created_at: now(),
    user_id: user.id,
    display_name: user.display_name,
    color: user.color,
  });
  broadcast('message', msg);
  return sendJson(res, 201, { message: msg });
}

// ════════════════════════════ CALENDAR ══════════════════════════════════
const calQ = {
  insert: db.prepare(
    `INSERT INTO events (title, description, date, start_time, end_time, location, city_n, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ),
  list: db.prepare(
    `SELECT e.*, u.display_name AS creator_name, u.color AS creator_color
     FROM events e JOIN users u ON u.id = e.created_by
     ORDER BY e.date, COALESCE(e.start_time, '99:99')`
  ),
  byId: db.prepare('SELECT * FROM events WHERE id = ?'),
  del: db.prepare('DELETE FROM events WHERE id = ?'),
};

function shapeEvent(r) {
  const city = cityByN(r.city_n);
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    location: r.location,
    cityN: r.city_n,
    city: city ? { n: city.n, name: city.city, venue: city.venue } : null,
    createdBy: r.created_by,
    creator: { name: r.creator_name, color: r.creator_color },
    createdAt: r.created_at,
  };
}

export async function listEvents(req, res) {
  const events = calQ.list.all().map(shapeEvent);
  // Tour shows surfaced as read-only calendar entries the crew can plan around.
  const shows = tourStops().map((s) => ({
    type: 'show',
    n: s.n,
    title: `Show ${String(s.n).padStart(2, '0')} · ${s.city}`,
    date: s.date,
    venue: s.venue,
    city: s.city,
    doors: s.doors,
    acdc: s.acdc,
    dayOff: s.dayOff || null,
  }));
  return sendJson(res, 200, { events, shows });
}

function validateEventBody(body) {
  const title = str(body.title, { min: 1, max: 120 });
  if (!title) return { error: 'Titel fehlt (1–120 Zeichen).' };
  if (!isDate(body.date)) return { error: 'Datum muss YYYY-MM-DD sein.' };
  const start = optTime(body.startTime);
  const end = optTime(body.endTime);
  if (start === undefined || end === undefined) return { error: 'Zeit muss HH:MM sein.' };
  const cityN = optInt(body.cityN);
  if (cityN === undefined) return { error: 'cityN muss eine Zahl sein.' };
  if (cityN !== null && !cityByN(cityN)) return { error: 'Unbekannte Stadt (cityN).' };
  const description = body.description != null ? str(body.description, { max: 2000 }) : null;
  if (description === null && body.description) return { error: 'Beschreibung zu lang.' };
  const location = body.location != null ? str(body.location, { max: 200 }) : null;
  return { value: { title, description: description || null, date: body.date, start, end, location: location || null, cityN } };
}

export async function createEvent(req, res, { user, body }) {
  const v = validateEventBody(body);
  if (v.error) return sendError(res, 400, v.error);
  const { title, description, date, start, end, location, cityN } = v.value;
  const info = calQ.insert.run(title, description, date, start, end, location, cityN, user.id, now());
  return sendJson(res, 201, { event: shapeEvent({ ...calQ.byId.get(info.lastInsertRowid), creator_name: user.display_name, creator_color: user.color }) });
}

export async function deleteEvent(req, res, { user, params }) {
  const ev = calQ.byId.get(Number(params.id));
  if (!ev) return sendError(res, 404, 'Event nicht gefunden.');
  if (ev.created_by !== user.id && user.role !== 'admin') {
    return sendError(res, 403, 'Nur Ersteller oder Admin darf löschen.');
  }
  calQ.del.run(ev.id);
  return sendJson(res, 200, { ok: true });
}

// ════════════════════════════ EXCURSIONS ════════════════════════════════
const exQ = {
  insert: db.prepare(
    `INSERT INTO excursions (title, description, city_n, date, time, location, meeting_point, capacity, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ),
  list: db.prepare(
    `SELECT e.*, u.display_name AS creator_name, u.color AS creator_color
     FROM excursions e JOIN users u ON u.id = e.created_by
     ORDER BY e.date, COALESCE(e.time, '99:99')`
  ),
  byId: db.prepare('SELECT * FROM excursions WHERE id = ?'),
  del: db.prepare('DELETE FROM excursions WHERE id = ?'),
  rsvps: db.prepare(
    `SELECT r.user_id, r.status, r.updated_at, u.display_name, u.color
     FROM excursion_rsvp r JOIN users u ON u.id = r.user_id
     WHERE r.excursion_id = ? ORDER BY r.updated_at`
  ),
  upsertRsvp: db.prepare(
    `INSERT INTO excursion_rsvp (excursion_id, user_id, status, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(excursion_id, user_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`
  ),
  removeRsvp: db.prepare('DELETE FROM excursion_rsvp WHERE excursion_id = ? AND user_id = ?'),
  countGoing: db.prepare(
    "SELECT COUNT(*) AS c FROM excursion_rsvp WHERE excursion_id = ? AND status = 'going'"
  ),
};

function shapeExcursion(r) {
  const city = cityByN(r.city_n);
  const rsvps = exQ.rsvps.all(r.id).map((p) => ({
    userId: p.user_id,
    displayName: p.display_name,
    color: p.color,
    status: p.status,
  }));
  const going = rsvps.filter((p) => p.status === 'going').length;
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    cityN: r.city_n,
    city: city ? { n: city.n, name: city.city, venue: city.venue } : null,
    date: r.date,
    time: r.time,
    location: r.location,
    meetingPoint: r.meeting_point,
    capacity: r.capacity,
    createdBy: r.created_by,
    creator: { name: r.creator_name, color: r.creator_color },
    createdAt: r.created_at,
    rsvps,
    goingCount: going,
    spotsLeft: r.capacity != null ? Math.max(0, r.capacity - going) : null,
  };
}

export async function listExcursions(req, res) {
  return sendJson(res, 200, { excursions: exQ.list.all().map(shapeExcursion) });
}

export async function createExcursion(req, res, { user, body }) {
  const title = str(body.title, { min: 1, max: 120 });
  if (!title) return sendError(res, 400, 'Titel fehlt (1–120 Zeichen).');
  if (!isDate(body.date)) return sendError(res, 400, 'Datum muss YYYY-MM-DD sein.');
  const time = optTime(body.time);
  if (time === undefined) return sendError(res, 400, 'Zeit muss HH:MM sein.');
  const cityN = optInt(body.cityN);
  if (cityN === undefined) return sendError(res, 400, 'cityN muss eine Zahl sein.');
  if (cityN !== null && !cityByN(cityN)) return sendError(res, 400, 'Unbekannte Stadt (cityN).');
  const capacity = optInt(body.capacity);
  if (capacity === undefined || (capacity !== null && (capacity < 1 || capacity > 10000))) {
    return sendError(res, 400, 'Kapazität muss zwischen 1 und 10000 liegen.');
  }
  const description = body.description != null ? str(body.description, { max: 2000 }) : null;
  if (description === null && body.description) return sendError(res, 400, 'Beschreibung zu lang.');
  const location = body.location != null ? str(body.location, { max: 200 }) : null;
  const meeting = body.meetingPoint != null ? str(body.meetingPoint, { max: 200 }) : null;

  const info = exQ.insert.run(
    title, description || null, cityN, body.date, time, location || null, meeting || null, capacity, user.id, now()
  );
  // Creator auto-joins as going.
  exQ.upsertRsvp.run(info.lastInsertRowid, user.id, 'going', now());
  return sendJson(res, 201, { excursion: shapeExcursion({ ...exQ.byId.get(info.lastInsertRowid), creator_name: user.display_name, creator_color: user.color }) });
}

export async function rsvpExcursion(req, res, { user, params, body }) {
  const ex = exQ.byId.get(Number(params.id));
  if (!ex) return sendError(res, 404, 'Ausflug nicht gefunden.');
  const status = str(body.status, { max: 10 });
  if (!['going', 'maybe', 'out'].includes(status)) {
    return sendError(res, 400, "Status muss 'going', 'maybe' oder 'out' sein.");
  }
  if (status === 'out') {
    exQ.removeRsvp.run(ex.id, user.id);
  } else {
    // Capacity check only applies to a *new* 'going' that isn't already counted.
    if (status === 'going' && ex.capacity != null) {
      const already = exQ.rsvps.all(ex.id).find((p) => p.user_id === user.id && p.status === 'going');
      if (!already && exQ.countGoing.get(ex.id).c >= ex.capacity) {
        return sendError(res, 409, 'Ausflug ist voll.');
      }
    }
    exQ.upsertRsvp.run(ex.id, user.id, status, now());
  }
  // Re-read via the list query so creator name/color are populated for the response.
  const full = exQ.list.all().find((r) => r.id === ex.id);
  return sendJson(res, 200, { excursion: shapeExcursion(full) });
}

export async function deleteExcursion(req, res, { user, params }) {
  const ex = exQ.byId.get(Number(params.id));
  if (!ex) return sendError(res, 404, 'Ausflug nicht gefunden.');
  if (ex.created_by !== user.id && user.role !== 'admin') {
    return sendError(res, 403, 'Nur Ersteller oder Admin darf löschen.');
  }
  exQ.del.run(ex.id);
  return sendJson(res, 200, { ok: true });
}
