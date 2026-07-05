# TourSmart — MacBook Setup Guide

> You're away for six weeks with just your MacBook. This doc gets you from zero to coding in under five minutes.

## Prerequisites (already on any modern Mac)
- `git` — ships with Xcode Command Line Tools; if missing, running `git` in Terminal triggers the install prompt
- `python3` — ships with macOS; no install needed
- A text editor — VS Code is great, TextEdit works in a pinch

## 1. Get the code

If the folder isn't already on this Mac (it probably is via Dropbox):

```bash
git clone https://github.com/keptnahab/TourSmart.git
cd TourSmart
```

If it's already there via Dropbox, just open Terminal in that folder.

## 2. Check your branch

```bash
git branch
```

You should be on `main`. For development work, switch to `ui-design`:

```bash
git checkout ui-design
git pull
```

> **Branch meaning:**
> - `main` = live at `amazinglighting.design` — only push here when releasing
> - `ui-design` = active development — all your day-to-day work goes here

## 3. Start the preview server

```bash
cd "/Users/mkue/Dropbox (Privat)/00_AI/00_Claude/Toursmart"
python3 -m http.server 3456
```

Open your browser: `http://localhost:3456`

Keep this Terminal window open while you work. Reload the browser tab after every edit to see changes — there's no hot-reload.

To stop the server: `Ctrl+C` in Terminal.

## 4. Everything is in one file

```
index.html   ← the entire app (~2655 lines, ~123 KB)
```

Open it in your editor. All CSS, JS, and data are inline — no build step, no npm, no Node. Just edit and reload.

## 5. Internet requirements

| Feature | Needs internet? |
|---------|----------------|
| Map tiles (dark background) | Yes (CartoDB CDN) |
| Google Fonts (Oswald, Space Mono) | Yes |
| Google Maps / Google Flights links | Yes (when you click them) |
| All city guide text | No |
| All timeline / itinerary data | No |
| Favourites (localStorage) | No |
| Animation | No |

You can read and edit the app offline. The map will be blank (grey tiles), but all the UI is functional.

## 6. Git workflow

```bash
# after editing index.html
git add index.html
git commit -m "short description of what you changed"
git push origin ui-design
```

To release to production — **push to `main` deploys automatically, no extra step**:
```bash
git push origin ui-design:main
```
Or switch to `main`, merge, and push:
```bash
git checkout main
git merge ui-design
git push origin main
git checkout ui-design
```
The host watches `main` and deploys on every push — there's nothing to trigger manually.

## 7. Where things are in index.html

| What | Where to look |
|------|--------------|
| CSS variables (colors, widths) | top of `<style>`, lines ~20–40 |
| `#top-bar` header + burger | HTML ~line 954, CSS ~line 90 |
| `SHOWS` data (18 venues) | JS near top of `<script>` |
| `DAYS` itinerary (87 days) | JS, after SHOWS |
| `GUIDES` city guide text | JS, largest data block |
| `openCity()` / `closeCity()` | ~line 2050 area |
| `openTravel()` / `closeCity()` | same area |
| `setAnimate()` / `setStatic()` | ~line 1900 |
| `initPOIGeolocation()` | ~line 2125 |
| Auto-play (map.whenReady) | last ~50 lines of script |

## 8. Current feature state (as of 2026-07-04)

Everything listed in `HANDOFF.md` is shipped and working:
- Looping animation, auto-plays on load
- Universal burger menu (all screen sizes): USER LOGIN · FAVORITES · STOP/START ANIMATION · SETTINGS
- FAVORITES panel (localStorage, export/import JSON)
- Mobile portrait bottom drawer with swipe + snap
- Mobile landscape compact header + burger
- Timeline drawer state restored after closing a modal
- Travel day modals: bus → Google Maps, charter → Google Flights
- GPS POI search with fallback to route midpoint
- "San Francisco" everywhere (hotel address still correctly says Santa Clara)

## 9. Starting a new Claude Code session

When you resume with Claude Code on the MacBook:
1. Open Terminal in the project folder
2. Run `claude` (or open the Claude desktop app)
3. Tell Claude: *"Read docs/HANDOFF.md and docs/ARCHITECTURE.md first, then we'll continue."*

Claude will pick up exactly where you left off.

## 10. Useful Terminal shortcuts

```bash
# Preview server
python3 -m http.server 3456

# Quick status
git status
git log --oneline -10

# Search for something in index.html
grep -n "initPOIGeolocation" index.html

# Word count (to see how big the file is)
wc -l index.html
```
