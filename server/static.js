// Static file serving with an explicit allowlist (never exposes server/ or
// data-runtime/). No external deps.
import { createReadStream, statSync } from 'node:fs';
import { join, normalize, extname, sep } from 'node:path';
import { ROOT } from './config.js';

const ROOT_PREFIX = ROOT.endsWith(sep) ? ROOT : ROOT + sep;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

// Only these path prefixes (relative to project root) may be served.
function resolveSafe(pathname) {
  // Map routes to files.
  let rel;
  if (pathname === '/' || pathname === '') rel = 'index.html';
  else if (pathname === '/crew' || pathname === '/crew/') rel = 'app/crew.html';
  else rel = pathname.replace(/^\/+/, '');

  // Allowlist: index.html, anything under app/ or data/.
  const allowed =
    rel === 'index.html' ||
    rel === 'favicon.ico' ||
    rel.startsWith('app/') ||
    rel.startsWith('data/');
  if (!allowed) return null;

  const full = normalize(join(ROOT, rel));
  // Guard against path traversal escaping the project root. Compare against
  // ROOT + separator so a sibling dir (e.g. a "<root>-runtime") can't slip
  // through a bare prefix match; allow ROOT itself too.
  if (full !== ROOT && !full.startsWith(ROOT_PREFIX)) return null;
  return full;
}

export function serveStatic(req, res, pathname) {
  const full = resolveSafe(pathname);
  if (!full) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }
  let st;
  try {
    st = statSync(full);
    if (st.isDirectory()) throw new Error('dir');
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }
  const type = TYPES[extname(full).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': st.size,
    'Cache-Control': 'no-cache',
  });
  if (req.method === 'HEAD') return res.end();
  const stream = createReadStream(full);
  stream.on('error', () => {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
  stream.pipe(res);
}
