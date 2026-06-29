// Integration test suite — exercises every endpoint + edge cases.
// Run a server on an ephemeral DB, hit it over HTTP, assert hard.
// Usage: node server/test/run.js   (exit code 0 = all pass)
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER = resolve(__dirname, '..', 'server.js');
const PORT = 4271;
const BASE = `http://127.0.0.1:${PORT}`;

let pass = 0, fail = 0;
const failures = [];
function ok(cond, name) {
  if (cond) { pass++; }
  else { fail++; failures.push(name); console.log('  ✗ ' + name); }
}
function eq(a, b, name) { ok(a === b, `${name} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`); }

async function req(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

async function waitForServer(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE + '/api/tour');
      if (res.status === 401 || res.status === 200) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('server did not start');
}

async function main() {
  const tmp = mkdtempSync(join(tmpdir(), 'toursmart-test-'));
  const dbPath = join(tmp, 'test.db');
  const child = spawn(process.execPath, [SERVER], {
    env: { ...process.env, PORT: String(PORT), TOURSMART_DB: dbPath, TOURSMART_SECRET: 'test-secret-fixed' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });

  try {
    await waitForServer();

    // ── AUTH ──
    let r = await req('/api/auth/register', { method: 'POST', body: { username: 'ab', displayName: 'X', password: 'longenough' } });
    eq(r.status, 400, 'register rejects short username');

    r = await req('/api/auth/register', { method: 'POST', body: { username: 'admin1', displayName: 'Admin One', password: 'short' } });
    eq(r.status, 400, 'register rejects short password');

    r = await req('/api/auth/register', { method: 'POST', body: { username: 'admin1', displayName: 'Admin One', password: 'password123', department: 'x'.repeat(41) } });
    eq(r.status, 400, 'register rejects over-long department');

    r = await req('/api/auth/register', { method: 'POST', body: { username: 'admin1', displayName: 'Admin One', password: 'password123', department: 'Lighting' } });
    eq(r.status, 201, 'register first user');
    eq(r.data.user.role, 'admin', 'first user is admin');
    const adminTok = r.data.token;
    ok(typeof adminTok === 'string' && adminTok.length > 20, 'admin token issued');

    r = await req('/api/auth/register', { method: 'POST', body: { username: 'ADMIN1', displayName: 'Dup', password: 'password123' } });
    eq(r.status, 409, 'register rejects duplicate username (case-insensitive)');

    r = await req('/api/auth/register', { method: 'POST', body: { username: 'crew2', displayName: 'Crew Two', password: 'password123' } });
    eq(r.status, 201, 'register second user');
    eq(r.data.user.role, 'crew', 'second user is crew');
    const crewTok = r.data.token;
    const crewId = r.data.user.id;

    r = await req('/api/auth/login', { method: 'POST', body: { username: 'admin1', password: 'wrongpass' } });
    eq(r.status, 401, 'login rejects wrong password');

    r = await req('/api/auth/login', { method: 'POST', body: { username: 'admin1', password: 'password123' } });
    eq(r.status, 200, 'login accepts correct password');

    r = await req('/api/me');
    eq(r.status, 401, 'me requires auth');

    r = await req('/api/me', { token: adminTok });
    eq(r.data.user.username, 'admin1', 'me returns current user');

    r = await req('/api/me', { token: 'garbage.token' });
    eq(r.status, 401, 'me rejects forged token');

    // tampered signature
    const parts = adminTok.split('.');
    const forged = parts[0] + '.' + 'x'.repeat(parts[1].length);
    r = await req('/api/me', { token: forged });
    eq(r.status, 401, 'me rejects tampered signature');

    // ── profile update ──
    r = await req('/api/me', { method: 'PATCH', token: crewTok, body: { color: 'notahex' } });
    eq(r.status, 400, 'patch rejects bad color');
    r = await req('/api/me', { method: 'PATCH', token: crewTok, body: { displayName: 'Crew Two Updated', color: '#3f7fd6' } });
    eq(r.status, 200, 'patch updates profile');
    eq(r.data.user.displayName, 'Crew Two Updated', 'displayName updated');

    // ── USERS ──
    r = await req('/api/users', { token: crewTok });
    eq(r.data.users.length, 2, 'roster lists all users');

    // ── CHAT ──
    r = await req('/api/messages', { method: 'POST', token: adminTok, body: { body: '' } });
    eq(r.status, 400, 'empty message rejected');

    r = await req('/api/messages', { method: 'POST', token: adminTok, body: { body: 'Hallo Crew' } });
    eq(r.status, 201, 'post message');
    const msgId = r.data.message.id;

    r = await req('/api/messages', { token: crewTok });
    ok(r.data.messages.some((m) => m.id === msgId), 'message visible to other user');
    ok(r.data.messages.every((m, i, a) => i === 0 || a[i - 1].id <= m.id), 'messages ascending by id');

    r = await req(`/api/messages?since=${msgId}`, { token: crewTok });
    eq(r.data.messages.length, 0, 'since filter excludes older');

    // oversized message
    r = await req('/api/messages', { method: 'POST', token: adminTok, body: { body: 'x'.repeat(2001) } });
    eq(r.status, 400, 'oversized message rejected');

    // ── CALENDAR ──
    r = await req('/api/events', { token: crewTok });
    ok(Array.isArray(r.data.shows) && r.data.shows.length === 18, 'events endpoint returns 18 shows');

    r = await req('/api/events', { method: 'POST', token: crewTok, body: { title: 'Crew BBQ', date: 'not-a-date' } });
    eq(r.status, 400, 'event rejects bad date');

    r = await req('/api/events', { method: 'POST', token: crewTok, body: { title: 'Crew BBQ', date: '2026-08-01', startTime: '25:00' } });
    eq(r.status, 400, 'event rejects bad time');

    r = await req('/api/events', { method: 'POST', token: crewTok, body: { title: 'Crew BBQ', date: '2026-08-01', startTime: '18:00', cityN: 6, location: 'Pool' } });
    eq(r.status, 201, 'create event');
    eq(r.data.event.city.name, 'Las Vegas', 'event linked to city');
    const eventId = r.data.event.id;

    r = await req('/api/events', { method: 'POST', token: crewTok, body: { title: 'Bad city', date: '2026-08-01', cityN: 999 } });
    eq(r.status, 400, 'event rejects unknown city');

    // delete permission: admin can delete crew's event
    r = await req(`/api/events/${eventId}`, { method: 'DELETE', token: adminTok });
    eq(r.status, 200, 'admin can delete any event');

    r = await req(`/api/events/99999`, { method: 'DELETE', token: adminTok });
    eq(r.status, 404, 'delete missing event 404');

    // ── EXCURSIONS ──
    r = await req('/api/excursions', { method: 'POST', token: adminTok, body: { title: 'Hoover Dam', date: '2026-07-31', time: '10:00', cityN: 6, capacity: 2 } });
    eq(r.status, 201, 'create excursion');
    eq(r.data.excursion.goingCount, 1, 'creator auto-joins as going');
    eq(r.data.excursion.spotsLeft, 1, 'spotsLeft computed');
    const exId = r.data.excursion.id;

    r = await req('/api/excursions', { method: 'POST', token: adminTok, body: { title: 'Neg cap', date: '2026-07-31', capacity: -5 } });
    eq(r.status, 400, 'excursion rejects negative capacity');

    // crew joins -> fills capacity (2)
    r = await req(`/api/excursions/${exId}/rsvp`, { method: 'POST', token: crewTok, body: { status: 'going' } });
    eq(r.status, 200, 'crew rsvp going');
    eq(r.data.excursion.goingCount, 2, 'goingCount=2');
    eq(r.data.excursion.spotsLeft, 0, 'now full');

    // a third going attempt should fail (capacity full) — register a 3rd user
    r = await req('/api/auth/register', { method: 'POST', body: { username: 'crew3', displayName: 'Crew Three', password: 'password123' } });
    const crew3 = r.data.token;
    r = await req(`/api/excursions/${exId}/rsvp`, { method: 'POST', token: crew3, body: { status: 'going' } });
    eq(r.status, 409, 'rsvp blocked when full');

    // maybe is allowed even when full
    r = await req(`/api/excursions/${exId}/rsvp`, { method: 'POST', token: crew3, body: { status: 'maybe' } });
    eq(r.status, 200, 'rsvp maybe allowed when full');

    // changing existing going->going must not double count or block
    r = await req(`/api/excursions/${exId}/rsvp`, { method: 'POST', token: crewTok, body: { status: 'going' } });
    eq(r.data.excursion.goingCount, 2, 're-going does not double count');

    // crew opts out -> frees a spot
    r = await req(`/api/excursions/${exId}/rsvp`, { method: 'POST', token: crewTok, body: { status: 'out' } });
    eq(r.data.excursion.goingCount, 1, 'opt-out frees spot');

    // bad status
    r = await req(`/api/excursions/${exId}/rsvp`, { method: 'POST', token: crewTok, body: { status: 'banana' } });
    eq(r.status, 400, 'rsvp rejects bad status');

    // crew (non-creator, non-admin) cannot delete admin's excursion
    r = await req(`/api/excursions/${exId}`, { method: 'DELETE', token: crew3 });
    eq(r.status, 403, 'non-owner cannot delete excursion');

    r = await req(`/api/excursions/${exId}`, { method: 'DELETE', token: adminTok });
    eq(r.status, 200, 'owner deletes excursion');

    // ── STATIC + SSE auth ──
    let sres = await fetch(BASE + '/');
    eq(sres.status, 200, 'static / serves map');
    sres = await fetch(BASE + '/crew');
    eq(sres.status, 200, 'static /crew serves app');
    sres = await fetch(BASE + '/app/crew.js');
    eq(sres.status, 200, 'static js served');
    sres = await fetch(BASE + '/server/server.js');
    eq(sres.status, 404, 'server source NOT served');
    sres = await fetch(BASE + '/data-runtime/secret');
    eq(sres.status, 404, 'runtime secret NOT served');
    sres = await fetch(BASE + '/api/stream');
    eq(sres.status, 401, 'SSE requires token');

    // path traversal
    sres = await fetch(BASE + '/app/../server/auth.js');
    ok(sres.status === 404 || sres.status === 400, 'path traversal blocked');

    // ── Robustness: malformed %-escape in a :id route must NOT crash server ──
    r = await req('/api/events/%ff', { method: 'DELETE', token: adminTok });
    ok(r.status === 404 || r.status === 400, 'malformed escape in route handled (no crash)');
    // server must still be alive afterwards
    r = await req('/api/me', { token: adminTok });
    eq(r.status, 200, 'server still alive after malformed-escape request');
    // malformed escape unauthenticated (match runs before auth) must also be safe
    sres = await fetch(BASE + '/api/excursions/%E0%A4%A/rsvp', { method: 'POST' });
    ok(sres.status === 401 || sres.status === 404 || sres.status === 400, 'malformed escape unauth handled');
    r = await req('/api/tour', { token: adminTok });
    eq(r.status, 200, 'server still alive after unauth malformed-escape');

  } finally {
    child.kill('SIGTERM');
    setTimeout(() => { try { rmSync(tmp, { recursive: true, force: true }); } catch {} }, 300);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) { console.log('FAILURES:\n - ' + failures.join('\n - ')); process.exit(1); }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
