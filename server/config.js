// Central config + secret bootstrap. No external deps.
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ROOT = resolve(__dirname, '..');            // project root (serves index.html + /data + /app)
export const RUNTIME_DIR = join(ROOT, 'data-runtime');   // gitignored: db + secret
export const DB_PATH = process.env.TOURSMART_DB || join(RUNTIME_DIR, 'toursmart.db');
export const PORT = Number(process.env.PORT || 4173);
export const HOST = process.env.HOST || '127.0.0.1';

// Token lifetime (7 days) — long enough for a tour leg, short enough to matter.
export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function ensureRuntimeDir() {
  if (!existsSync(RUNTIME_DIR)) mkdirSync(RUNTIME_DIR, { recursive: true });
}

// Persist a server secret so signed tokens survive restarts.
export function loadSecret() {
  if (process.env.TOURSMART_SECRET) return Buffer.from(process.env.TOURSMART_SECRET);
  ensureRuntimeDir();
  const secretPath = join(RUNTIME_DIR, 'secret');
  if (existsSync(secretPath)) {
    const v = readFileSync(secretPath, 'utf8').trim();
    if (v) return Buffer.from(v, 'hex');
  }
  const secret = randomBytes(32);
  writeFileSync(secretPath, secret.toString('hex'), { mode: 0o600 });
  return secret;
}

export { ensureRuntimeDir };
