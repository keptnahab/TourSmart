# TourSmart ⚡

Crew companion for the **AC/DC PWR/UP Tour 2026 (North America)** — a self-hosted, single-file interactive map with show data and curated city guides for all 18 stops, plus a private/shared favourites list.

## Status
Pre-prototype scaffold. Build context lives in [`docs/TourSmart_Handoff.md`](docs/TourSmart_Handoff.md) and the build instructions in [`docs/BUILD_SPEC.md`](docs/BUILD_SPEC.md). Tour data is in [`data/shows.json`](data/shows.json); city guides in [`data/guides.json`](data/guides.json) (3 cities populated, 15 to come).

## What it is
- Dark, minimal Leaflet map (CartoDB `dark_matter` tiles — no API key).
- 18 tour stops with venue, capacity, doors and set times.
- Curated guides per city: food, coffee, bars, sights, nature, day-off — tuned to the crew hotel.
- Favourites / to-do ("Steel List") stored in the browser with JSON export/import.

## Crew Companion (now with a backend ⚡)
The "later: backend" step is built. A **zero-dependency Node.js** server
(`node server/server.js`, no `npm install`) adds real multi-user features in the
TourSmart look at **`/crew`**:
- **Login / registration** (scrypt-hashed passwords, signed tokens; first user = admin)
- **Crew chat** — real-time via Server-Sent Events, with online presence
- **Shared calendar** — crew events merged with the 18 tour shows + day-offs
- **Excursions** — plan trips per city, RSVP going/maybe/out, capacity & participants
- **Crew roster** — who's on tour, who's online

The map app and the crew app are served by the same server; the map's **⚡ CREW**
button links across. See [`server/README.md`](server/README.md) for run/config/API/security details.

```bash
node server/server.js          # → http://127.0.0.1:4173/  (map) and /crew (companion)
node server/test/run.js        # 58-assertion integration suite
```

## Roadmap
1. ✅ **Done:** static, self-hosted single `index.html` (map).
2. ✅ **Done:** backend for real per-user logins + chat + shared calendar + excursions.
3. **Later:** live "open now" data (API key stays server-side), shared favourites sync.

## Structure
```
index.html          the app (built in Cowork)
README.md
.gitignore
docs/               handoff + build spec
data/               shows.json, guides.json
```

## Build
Open `index.html` in a browser, or host the file on any static web host. Map tiles need an internet connection; guide content works offline.
