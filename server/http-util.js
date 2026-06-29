// Tiny HTTP helpers: JSON body parsing, responses, validation. No external deps.

export function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

export function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

// Read and parse a JSON request body with a hard size cap (defends against
// memory-exhaustion from oversized payloads).
const MAX_BODY = 64 * 1024; // 64 KB

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try {
        const parsed = JSON.parse(raw);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return reject(Object.assign(new Error('Body must be a JSON object'), { statusCode: 400 }));
        }
        resolve(parsed);
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

// ── Validation helpers ───────────────────────────────────────────────────
export function str(value, { min = 0, max = Infinity, trim = true } = {}) {
  if (typeof value !== 'string') return null;
  const v = trim ? value.trim() : value;
  if (v.length < min || v.length > max) return null;
  return v;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isDate(v) {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function isTime(v) {
  return typeof v === 'string' && TIME_RE.test(v);
}

export function optTime(v) {
  if (v == null || v === '') return null;
  return isTime(v) ? v : undefined; // undefined signals "provided but invalid"
}

export function optInt(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : undefined;
}
