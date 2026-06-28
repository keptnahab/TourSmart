# TourSmart ⚡

Crew companion for the **AC/DC PWR/UP Tour 2026 (North America)** — a self-hosted, single-file interactive map with show data and curated city guides for all 18 stops, plus a private/shared favourites list.

## Status
Pre-prototype scaffold. Build context lives in [`docs/TourSmart_Handoff.md`](docs/TourSmart_Handoff.md) and the build instructions in [`docs/BUILD_SPEC.md`](docs/BUILD_SPEC.md). Tour data is in [`data/shows.json`](data/shows.json); city guides in [`data/guides.json`](data/guides.json) (3 cities populated, 15 to come).

## What it is
- Dark, minimal Leaflet map (CartoDB `dark_matter` tiles — no API key).
- 18 tour stops with venue, capacity, doors and set times.
- Curated guides per city: food, coffee, bars, sights, nature, day-off — tuned to the crew hotel.
- Favourites / to-do ("Steel List") stored in the browser with JSON export/import.

## Roadmap
1. **Now:** static, self-hosted single `index.html`.
2. **Later:** backend for real per-user logins + a shared crew list + live "open now" data (API key stays server-side).

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
