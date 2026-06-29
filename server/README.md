# TourSmart — Crew Companion (Backend)

Real multi-user layer for the AC/DC PWR/UP Tour 2026 crew: **login, crew chat,
shared calendar and excursions** — the "later: backend" item from the project
roadmap, now built.

**Zero external dependencies.** Pure Node.js built-ins only:
`node:sqlite` (DB), `node:crypto` (scrypt password hashing + HMAC-signed
tokens), `node:http`, and **Server-Sent Events** for real-time chat & presence.
Nothing to `npm install`.

## Run

```bash
node server/server.js
# or: npm start
```

Then open:
- **Map app:**  http://127.0.0.1:4173/        (the existing Leaflet map)
- **Crew app:** http://127.0.0.1:4173/crew     (login, chat, calendar, excursions)

The **first** account that registers becomes **admin** (can delete any event /
excursion). Everyone else is `crew`.

### Config (env vars, all optional)
| Var | Default | Meaning |
|-----|---------|---------|
| `PORT` | `4173` | listen port |
| `HOST` | `127.0.0.1` | bind address |
| `TOURSMART_DB` | `data-runtime/toursmart.db` | SQLite file |
| `TOURSMART_SECRET` | auto-generated, persisted to `data-runtime/secret` | token signing key |

`data-runtime/` (the SQLite DB + the signing secret) is git-ignored — it never
gets committed.

## API

All `/api/*` routes except `register`/`login` require `Authorization: Bearer <token>`.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register` | create account → `{token, user}` |
| POST | `/api/auth/login` | `{token, user}` |
| GET  | `/api/me` · PATCH `/api/me` | current user / update profile |
| GET  | `/api/users` | crew roster + who's online |
| GET  | `/api/tour` | the 18 tour stops (reference) |
| GET/POST | `/api/messages` | chat history / send |
| GET  | `/api/stream?token=…` | SSE: live messages + presence |
| GET/POST | `/api/events` · DELETE `/api/events/:id` | shared calendar (merges tour shows + day-offs) |
| GET/POST | `/api/excursions` · DELETE `/api/excursions/:id` | excursions |
| POST | `/api/excursions/:id/rsvp` | `{status: "going"\|"maybe"\|"out"}` |

## Tests

```bash
node server/test/run.js     # spins up an ephemeral server + DB, 58 assertions
```

Covers auth (incl. forged/tampered tokens, duplicate usernames, rate-limit
shape), capacity enforcement, delete permissions, static-file allowlist (server
source & secret are NOT served), path traversal, and the malformed-`%`-escape
crash regression.

## Security notes (read before exposing beyond localhost)

- **Passwords:** scrypt with a per-user random salt; constant-time comparison.
- **Tokens:** stateless, HMAC-SHA256 signed, 7-day expiry. Logout is client-side
  (drops the token); there is no server-side revocation list yet.
- **SSE token in the URL:** `EventSource` can't send headers, so the stream is
  authed via `?token=`. On a real deployment that token can land in access logs
  — terminate TLS at a reverse proxy and/or move to a cookie before going public.
- **No TLS / no CORS headers:** intended for localhost or behind a trusted
  reverse proxy. Same-origin only.
- **First user = admin:** register the admin account before sharing the URL.

## Architecture

```
server/
  server.js     http server, routing, SSE endpoint, error guards
  router.js     tiny method+path router (:params)
  handlers.js   all REST handlers (auth, users, chat, calendar, excursions)
  auth.js       scrypt hashing + signed-token issue/verify
  db.js         node:sqlite schema + tour-stop reference loader
  sse.js        SSE hub: broadcast + online presence
  static.js     static file serving with an explicit allowlist
  http-util.js  JSON body parsing (size-capped) + validation helpers
  config.js     paths + secret bootstrap
  test/run.js   integration test suite
app/
  crew.html / crew.css / crew.js   the crew companion frontend
```
