// TourSmart Crew Companion — HTTP server. Pure Node.js, zero external deps.
import http from 'node:http';
import { PORT, HOST } from './config.js';
import { Router } from './router.js';
import { userFromRequest } from './auth.js';
import { addClient, removeClient } from './sse.js';
import { sendError, readJsonBody } from './http-util.js';
import * as h from './handlers.js';

const router = new Router();

// Auth (public)
router.post('/api/auth/register', h.register, { auth: false });
router.post('/api/auth/login', h.login, { auth: false });

// Session
router.get('/api/me', h.me);
router.patch('/api/me', h.updateMe);

// Roster + tour reference
router.get('/api/users', h.listUsers);
router.get('/api/tour', h.listTour);

// Chat
router.get('/api/messages', h.listMessages);
router.post('/api/messages', h.postMessage);

// Calendar
router.get('/api/events', h.listEvents);
router.post('/api/events', h.createEvent);
router.del('/api/events/:id', h.deleteEvent);

// Excursions
router.get('/api/excursions', h.listExcursions);
router.post('/api/excursions', h.createExcursion);
router.post('/api/excursions/:id/rsvp', h.rsvpExcursion);
router.del('/api/excursions/:id', h.deleteExcursion);

function clientIp(req) {
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

const server = http.createServer((req, res) => {
  // Any throw/rejection anywhere in request handling lands here instead of
  // becoming an unhandledRejection that kills the process.
  handleRequest(req, res).catch((err) => {
    console.error('Request error:', err);
    try {
      if (!res.headersSent) sendError(res, 500, 'Interner Serverfehler.');
      else res.end();
    } catch { /* socket already gone */ }
  });
});

async function handleRequest(req, res) {
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || HOST}`);
  } catch {
    return sendError(res, 400, 'Bad URL');
  }
  const pathname = url.pathname;

  // ── SSE stream (auth via ?token= because EventSource can't set headers) ──
  if (pathname === '/api/stream') {
    const token = url.searchParams.get('token');
    const user = userFromRequest({ headers: { authorization: `Bearer ${token || ''}` } });
    if (!user) return sendError(res, 401, 'Nicht angemeldet.');
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 3000\n\n');
    res.write(`event: hello\ndata: ${JSON.stringify({ userId: user.id })}\n\n`);
    const client = addClient(res, user);
    req.on('close', () => removeClient(client));
    return;
  }

  // ── REST API ──
  if (pathname.startsWith('/api/')) {
    const matched = router.match(req.method, pathname);
    if (!matched) return sendError(res, 404, 'Endpunkt nicht gefunden.');
    const { route, params } = matched;

    let user = null;
    if (route.auth) {
      user = userFromRequest(req);
      if (!user) return sendError(res, 401, 'Nicht angemeldet.');
    }

    let body = {};
    if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
      try {
        body = await readJsonBody(req);
      } catch (err) {
        return sendError(res, err.statusCode || 400, err.message || 'Fehlerhafter Body.');
      }
    }

    const query = Object.fromEntries(url.searchParams.entries());
    try {
      await route.handler(req, res, { user, params, body, query, ip: clientIp(req) });
    } catch (err) {
      console.error('Handler error:', err);
      if (!res.headersSent) sendError(res, 500, 'Interner Serverfehler.');
    }
    return;
  }

  // ── Static files (map app, crew app, data) ──
  if (req.method === 'GET' || req.method === 'HEAD') {
    const { serveStatic } = await import('./static.js');
    return serveStatic(req, res, pathname);
  }

  return sendError(res, 405, 'Methode nicht erlaubt.');
}

// Last-resort guards: never let one bad request take the whole server down.
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
process.on('uncaughtException', (err) => console.error('Uncaught exception:', err));

server.listen(PORT, HOST, () => {
  console.log(`\n⚡ TourSmart Crew Companion`);
  console.log(`   Map app:  http://${HOST}:${PORT}/`);
  console.log(`   Crew app: http://${HOST}:${PORT}/crew\n`);
});

// Graceful shutdown for clean restarts during testing.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500).unref();
  });
}

export { server };
