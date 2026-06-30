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
- Remote: `https://github.com/keptnahab/TourSmart.git`
- Live URL: `amazinglighting.design`

## What's built (as of 2026-06-30)

### Map
- Leaflet 1.9.4 on CartoDB `dark_matter` tiles (no API key)
- 18 show markers — grey circles with show number, gold border + larger when active
- Permanent city-name tooltips (small grey, uppercase Space Mono)
- Active city label flips to gold chip (Oswald bold) anchored above marker
- Per-city label direction/nudge tuned to avoid crowding in dense NE corridor (see `LABEL_DIR`, `LABEL_NUDGE`)
- Route polyline: muted/thin at rest, full red during animation
- Animated route: stepped, 2 s per city, glowing dot + pulse ring on active marker; auto-plays once on every page load then stops
- Animate/static toggle via ⚡ ANIMATE button

### Timeline
- Desktop: fixed 360 px panel on the right; map fills the rest
- Mobile portrait (≤639 px): bottom drawer, peek height 58 px, swipeable with snap
- Mobile landscape (≤1180 px width + landscape): burger menu, compact header, same side-panel layout
- Drawer restores its open/closed state after closing a modal

### City modals
- Show sheet: doors, support act times, AC/DC, curfew, capacity
- Crew hotel with direct Google Maps link
- Full city guide (food, coffee, bars, sights, nature, day-off) — all 18 cities populated
- Favourites/done toggles per guide item

### Travel day modals
- Triggered from timeline travel-day rows
- Mode auto-detected: `bus` (bus/coach in notes), `charter` (charter/flight in notes), `travel` (generic)
- Mini Leaflet map with route line (dashed for charter)
- Distance (road miles for bus, great-circle for charter), estimated drive time for bus
- Map tap/click hint: "TAP" on mobile, "CLICK" on desktop
- Bus: links to Google Maps with driving mode; charter: links to Google Flights
- "Along the route" POI section (bus only): gas, food, coffee, rest areas, hotels, sights
  - Default links center on route midpoint; GPS upgrade runs silently via `navigator.geolocation`
  - If granted: links update to actual device position (zoom 13), note updates
  - If denied/unsupported: falls back to midpoint, note updates

### Favourites (Steel List)
- `localStorage` key: `toursmart_favs`
- Per-item: `{ id: "<n>::<cat>::<name>", city, cat, name, done }`
- Panel: items grouped by city, toggle done, remove, export JSON, import JSON

### Controls / burger menu
- Desktop (>1180 px or portrait >639 px): buttons shown directly
- Portrait mobile (≤639 px): burger ☰ → dropdown
- Landscape mobile/tablet (≤1180 px + landscape): burger ☰ → dropdown

## Known issues / watch-outs
- Leaflet `tooltip.update()` must be called when switching label direction on the active marker, otherwise the chip is mis-positioned
- `clearTravelMini()` wraps `travelMini.remove()` in try/catch — Leaflet throws if the container was already removed from DOM
- `initTravelModal` must call `travelMini.setView()` before adding any GeoJSON layers (Leaflet throws otherwise)
- `#timeline-view` must NOT have `touch-action: none` — it breaks scrolling inside the expanded list; only `#tl-handle` should have it

## Workflow
1. Always edit `index.html` in the worktree (`/Users/mkue/…/Toursmart/.claude/worktrees/mystifying-hellman-38a27e/index.html` on the `ui-design` branch)
2. After each change: `git add index.html && git commit && git push origin ui-design`
3. Sync to main: `cp index.html <project-root>/index.html` then commit + push `origin main`
4. Preview server: `python3 -m http.server 3456` from project root

## Pending / future
- KML export for Google My Maps (deferred)
- Backend for crew-shared Steel List / real login (deferred)
- "Open now" live data via server-side API key (deferred)
