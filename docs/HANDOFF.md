# TourSmart — Handoff

> Read this file plus `ARCHITECTURE.md` and `DESIGN.md` before starting any new session. All code lives in a single file: `index.html` (~2655 lines, ~123 KB).

## Project in one sentence
Mobile-first PWA companion for AC/DC PWR/UP Tour NA 2026 crew — interactive route map, 87-day itinerary, city guides for all 18 stops, travel day modals with mini-maps and GPS-based POI search.

## Owner
**Michael Kühnbandner** — Senior Lighting Designer & Screen Director, AC/DC PWR/UP Tour 2026. Mac user, basic HTML/JS knowledge, not a developer. Design priority: dark, minimal, expressive — less is more.

## Repo
- GitHub: `https://github.com/keptnahab/TourSmart.git`
- Main production branch: `main`
- Active dev branch: `ui-design`
- Live URL: `amazinglighting.design`

## Deployment
**There is no auto-deploy.** `git push origin main` only updates GitHub — it does NOT update the live site. The live site is hosted on **Strato** and requires a manual upload after pushing:
1. `git push origin main` (keep GitHub in sync / version history)
2. Manually upload `index.html` to the Strato server (e.g. via Strato's file manager or an FTP/SFTP client)

Do not tell the user a change is "live" just because it was pushed to git — confirm the Strato upload happened too.

## What's built (as of 2026-07-04)

### Map
- Leaflet 1.9.4 on CartoDB `dark_matter` tiles (no API key)
- 18 show markers — grey circles with show number, gold border + larger when active
- Permanent city-name tooltips (small grey, uppercase Space Mono)
- Active city label flips to gold chip (Oswald bold) anchored above marker
- Per-city label direction/nudge tuned to avoid crowding in dense NE corridor (`LABEL_DIR`, `LABEL_NUDGE`)
- Route polyline: muted/thin at rest, full red during animation
- Animated route: stepped, 2 s per city, glowing dot + pulse ring; **loops indefinitely**, auto-plays on every load

### Burger menu (universal — all screen sizes)
- Single `#top-bar` flex container wraps `#header` + `#controls-wrap` — burger height always matches header height exactly
- Menu order: USER LOGIN (greyed/disabled) → FAVORITES → STOP/START ANIMATION → SETTINGS (greyed/disabled)
- Button text is live state: `■ STOP ANIMATION` while looping, `▶ START ANIMATION` when stopped
- Desktop: `#top-bar` right edge = `--panel-w + 20px` so it never overlaps an open panel

### Timeline
- Desktop: fixed 360 px panel on the right (`--tl-w: 360px`); map fills the rest
- Mobile portrait (≤639 px): bottom drawer, peek height 58 px, swipeable + snap
- Mobile landscape (≤1180 px + landscape): same side-panel layout, compact header for short screens (≤500 px tall)
- Drawer restores its open/closed state after closing a modal (`preModalTlExpanded` flag)

### Panels (city modal / Favorites)
- Width: `--panel-w: 360px` — matches `--tl-w` exactly so panels sit flush over the timeline with no map bleed
- Desktop: slides in from right; mobile: slides up from bottom
- City modal: show sheet, crew hotel link, full city guide (all 18 cities), favourites/done toggles
- Favourites (Steel List): grouped by city, toggle done, remove, export/import JSON

### Travel day modals
- Mode auto-detected from `day.note`: `bus` / `charter` / `travel`
- Mini Leaflet map, distance, drive time (bus only)
- Hint text: "TAP" on mobile, "CLICK" on desktop
- Bus → Google Maps driving; Charter → Google Flights (`google.com/travel/flights?q=…`)
- "Along the route" POI (bus only): geolocation-first (`navigator.geolocation`), falls back to route midpoint
  - `id="poi-location-note"` + `class="poi-link" data-q="…"` on each anchor for live DOM swap

## Known issues / watch-outs
- Leaflet `tooltip.update()` must be called when switching active label direction — otherwise chip mispositions
- `clearTravelMini()` wraps `travelMini.remove()` in try/catch — Leaflet throws if container already removed
- `initTravelModal` must call `travelMini.setView()` before adding GeoJSON layers
- `#timeline-view` must NOT have `touch-action: none` — breaks scroll inside expanded list; only `#tl-handle` gets it

## Workflow (MacBook — no worktree)
1. Edit `index.html` directly in the project root on branch `ui-design`
2. `git add index.html && git commit -m "…" && git push origin ui-design`
3. To release to production: also commit + push to `main`
4. Preview: `python3 -m http.server 3456` → open `http://localhost:3456`
5. See `docs/09_MACBOOK.md` for full setup instructions

## Pending / future
- KML export for Google My Maps (deferred)
- Backend for crew-shared Steel List / real login (USER LOGIN stub is in the menu, greyed out)
- SETTINGS screen (stub in menu, greyed out)
- "Open now" live data via server-side API key (deferred)
