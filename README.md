# TourSmart ⚡

Crew companion for the **AC/DC PWR/UP Tour NA 2026** — interactive route map, 87-day itinerary, city guides for all 18 stops, travel day modals with GPS-based POI search.

Live: `amazinglighting.design` (hosted on Strato — deploy is a manual upload, see [`docs/HANDOFF.md`](docs/HANDOFF.md#deployment))

## Quick start
Open `index.html` in any browser, or serve locally:
```
python3 -m http.server 3456
```
Map tiles need an internet connection; all other content works offline.

## What it does
- Dark Leaflet map on CartoDB dark_matter tiles — no API key
- 18 show markers with animated stepped route (auto-plays once on load)
- Mobile: fullscreen map + swipeable bottom timeline drawer
- Desktop: map + fixed 360 px timeline panel
- Tap any show → city modal (show sheet, crew hotel link, full city guide)
- Tap any travel day → travel modal (mini-map, distance, drive time, POI search via GPS)
- Bus travel links to Google Maps (driving); charter travel links to Google Flights
- Favourites / Steel List stored in `localStorage`, exportable as JSON

## Docs
| File | Contents |
|------|---------|
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | Current state, workflow, known issues |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Code structure, key functions, line map |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Design tokens, typography, responsive rules |
| [`docs/DATA.md`](docs/DATA.md) | Data schemas: SHOWS, GUIDES, DAYS, TRAVEL_CFG |

## Structure
```
index.html          the entire app (~2655 lines, ~123 KB)
README.md
docs/               documentation for continuing work
data/               legacy JSON files (data is now embedded in index.html)
```

## Branches
- `main` — production
- `ui-design` — active development
