// Password hashing (scrypt) + stateless signed tokens (HMAC-SHA256). No external deps.
import {
  scryptSync,
  randomBytes,
  timingSafeEqual,
  createHmac,
} from 'node:crypto';
import { loadSecret, TOKEN_TTL_SECONDS } from './config.js';
import { db } from './db.js';

const SECRET = loadSecret();
const SCRYPT_KEYLEN = 64;

// ── Passwords ────────────────────────────────────────────────────────────
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, salt, expectedHash) {
  let derived;
  try {
    derived = scryptSync(password, salt, SCRYPT_KEYLEN);
  } catch {
    return false;
  }
  const expected = Buffer.from(expectedHash, 'hex');
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

// ── Tokens (compact JWT-like: payloadB64.sigB64) ─────────────────────────
function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function sign(payloadB64) {
  return createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
}

export function issueToken(userId) {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload = b64url(JSON.stringify({ uid: userId, exp }));
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot < 1) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expectedSig = sign(payloadB64);
  // Constant-time compare; lengths must match for timingSafeEqual.
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload || typeof payload.uid !== 'number') return null;
  if (typeof payload.exp !== 'number' || payload.exp < Date.now() / 1000) return null;
  return payload;
}

// Resolve the current user from a request's Authorization header. Returns the
// public user row (no password fields) or null.
const selectUser = db.prepare(
  'SELECT id, username, display_name, role, department, color, created_at FROM users WHERE id = ?'
);

export function userFromRequest(req) {
  const header = req.headers['authorization'] || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const payload = verifyToken(m[1]);
  if (!payload) return null;
  return selectUser.get(payload.uid) || null;
}
