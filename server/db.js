// SQLite via Node's built-in node:sqlite (Node >= 22.5). No native build, no npm install.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DB_PATH, ROOT, ensureRuntimeDir } from './config.js';

ensureRuntimeDir();

export const db = new DatabaseSync(DB_PATH);

// Pragmas: WAL for concurrent reads, foreign keys on.
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    display_name  TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'crew',
    department    TEXT,
    color         TEXT NOT NULL DEFAULT '#d4262a',
    pw_hash       TEXT NOT NULL,
    pw_salt       TEXT NOT NULL,
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    channel     TEXT NOT NULL DEFAULT 'crew',
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body        TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel, id);

  CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    description TEXT,
    date        TEXT NOT NULL,           -- YYYY-MM-DD
    start_time  TEXT,                    -- HH:MM
    end_time    TEXT,
    location    TEXT,
    city_n      INTEGER,                 -- optional link to a tour stop (shows.json n)
    created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

  CREATE TABLE IF NOT EXISTS excursions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,
    description   TEXT,
    city_n        INTEGER,               -- optional link to a tour stop
    date          TEXT NOT NULL,
    time          TEXT,
    location      TEXT,
    meeting_point TEXT,
    capacity      INTEGER,               -- NULL = unlimited
    created_by    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_excursions_date ON excursions(date);

  CREATE TABLE IF NOT EXISTS excursion_rsvp (
    excursion_id INTEGER NOT NULL REFERENCES excursions(id) ON DELETE CASCADE,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'going',   -- going | maybe | out
    updated_at   INTEGER NOT NULL,
    PRIMARY KEY (excursion_id, user_id)
  );
`);

// Tour stops are read-only reference data shared with the map app.
let _stops = null;
export function tourStops() {
  if (_stops) return _stops;
  try {
    const raw = readFileSync(join(ROOT, 'data', 'shows.json'), 'utf8');
    _stops = JSON.parse(raw).stops || [];
  } catch {
    _stops = [];
  }
  return _stops;
}

export function cityByN(n) {
  if (n == null) return null;
  return tourStops().find((s) => s.n === Number(n)) || null;
}
