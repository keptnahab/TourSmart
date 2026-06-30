# TourSmart — Architecture

## File structure
```
index.html          Single-file app — all CSS, JS, and data inline (~2655 lines)
README.md
docs/
  HANDOFF.md        Current state, workflow, known issues
  ARCHITECTURE.md   This file — code structure and key functions
  DESIGN.md         Design tokens, typography, responsive rules
  DATA.md           Data schemas: SHOWS, GUIDES, DAYS, TRAVEL_CFG
data/               Legacy JSON files (data is now embedded in index.html)
```

## index.html sections (by line range, approximate)
| Lines | Content |
|-------|---------|
| 1–20 | `<head>`, Google Fonts (Oswald, Space Mono, Inter), Leaflet CSS |
| 21–35 | CSS custom properties (`:root`) |
| 36–1000 | All CSS (map, header, controls, timeline, modals, guide items, travel modal) |
| 1000–1015 | HTML structure (map div, header, controls-wrap, overlays, timeline) |
| 1029–1049 | `const SHOWS` — 18 show objects |
| 1050–1612 | `const GUIDES` — city guide data for all 18 cities |
| 1613–1693 | Favourites helpers (`loadFavs`, `saveFavs`, `toggleFav`, etc.) |
| 1694–1714 | Map init globals (`isMobile`, `MK/MFS/MBW` marker sizes, `LABEL_DIR`, `LABEL_NUDGE`) |
| 1715–1776 | Marker creation loop + `labelEl`, `refreshActiveLabel` |
| 1777–1899 | Route drawing: `drawStatic`, `drawAnimated`, `easeInOut`, dot/pulse animation |
| 1900–1930 | Mode switching: `setStatic`, `setAnimate` |
| 1931–1982 | Modal state globals, `openCity`, `closeCity`, `clearTravelMini` |
| 1984–2012 | `TRAVEL_CFG`, `detectTravelMode`, `legFacts`, `haversineKm` |
| 2013–2036 | `openTravel` |
| 2037–2094 | `buildTravelHTML` |
| 2095–2124 | `initTravelModal` |
| 2125–2146 | `initPOIGeolocation` |
| 2147–2260 | `buildCityHTML`, `buildGuideHTML`, `bindItemToggles` |
| 2260–2340 | Steel List panel: `closeSteelPanel`, `renderSteelList` |
| 2337–2460 | Utilities: `fmtDate`, `fmtDateLong`, `esc`, `fmtDayMonth` |
| 2460–2560 | `const DAYS` — 87-day itinerary array |
| 2560–2660 | Timeline render, `expandTimeline`, `collapseTimeline`, swipe handler |

## Key globals
```js
const SHOWS          // Array of 18 show objects
const GUIDES         // Object keyed by show.n (string) → city guide data
const DAYS           // Array of 87 itinerary day objects
const TRAVEL_CFG     // { bus, charter, travel } — icon/color/label
const isMobile       // window.innerWidth < 640 (computed once at load)
const MK, MFS, MBW   // Marker size constants (responsive)
const LABEL_DIR      // { [n]: 'top'|'bottom'|'left'|'right' } — per-city label direction
const LABEL_NUDGE    // { [n]: [dx, dy] } — per-city pixel nudge
let markersByN       // { [n]: L.circleMarker } — all Leaflet markers
let markerEls        // { [n]: HTMLElement } — marker icon DOM elements
let routeSegs        // Array of active Leaflet polylines
let animCityN        // Show number currently highlighted by animation
let clickedCityN     // Show number currently highlighted by user click
let travelMini       // Active Leaflet mini-map instance (in travel modal)
let geoCache         // { context: GeoJSON, us: GeoJSON } — cached boundary layers
let tlExpanded       // Boolean — timeline drawer state
let preModalTlExpanded // Boolean — timeline state saved before opening a modal
```

## Key functions

### Map / animation
| Function | Purpose |
|----------|---------|
| `refreshActiveLabel()` | Toggles `.active` class + repositions tooltip for current active city |
| `drawStatic()` | Renders full route as single polyline |
| `drawAnimated(loop)` | Stepped animation, 2 s/city; `loop=false` stops after one pass |
| `setStatic()` | Switch to static mode |
| `setAnimate(loop)` | Switch to animated mode |
| `pulseRing(show)` | Draws expanding CSS-animated ring on the active marker |

### Modal / travel
| Function | Purpose |
|----------|---------|
| `openCity(show)` | Opens city detail modal; saves + collapses timeline |
| `closeCity()` | Closes modal; restores pre-modal timeline state |
| `openTravel(day)` | Opens travel day modal; saves + collapses timeline |
| `buildTravelHTML(day, mode, cfg, dest)` | Returns HTML string for travel modal body |
| `initTravelModal(day, mode, dest)` | Initialises Leaflet mini-map inside travel modal |
| `initPOIGeolocation()` | Requests GPS; updates `.poi-link` hrefs + note text if granted |
| `buildCityHTML(show)` | Returns HTML string for city modal body |
| `buildGuideHTML(show, g)` | Returns HTML string for the guide section |
| `detectTravelMode(day)` | Returns `'bus'` \| `'charter'` \| `'travel'` from day.note text |

### Timeline
| Function | Purpose |
|----------|---------|
| `expandTimeline()` | Opens drawer (mobile) or no-op (desktop) |
| `collapseTimeline()` | Closes drawer |
| Swipe IIFE | `touchstart/move/end` on `#tl-handle` — drag-snap behaviour |

## External dependencies (CDN, no API key required)
- Leaflet 1.9.4 — `unpkg.com/leaflet@1.9.4/`
- CartoDB dark_matter tiles — `{s}.basemaps.cartocdn.com/dark_matter_all/{z}/{x}/{y}{r}.png`
- Google Fonts — Oswald, Space Mono, Inter
- US + Canada boundary GeoJSON — `cdn.jsdelivr.net/npm/us-atlas` + `cdn.jsdelivr.net/npm/world-atlas`

## Responsive breakpoints
| Breakpoint | Behaviour |
|-----------|-----------|
| ≤ 639 px (portrait) | Mobile: fullscreen map, bottom timeline drawer, burger menu |
| ≥ 640 px | Desktop: map fills left, 360 px timeline panel right |
| ≤ 1180 px + landscape orientation | Burger menu (side-panel layout preserved) |
| ≤ 500 px height + landscape | Compact header (smaller wordmark, shorter vignette) |

## URL schemes used
| Destination | URL pattern |
|------------|-------------|
| Google Maps directions (bus) | `https://www.google.com/maps/dir/?api=1&origin=…&destination=…&travelmode=driving` |
| Google Flights (charter) | `https://www.google.com/travel/flights?q=Flights+from+X+to+Y` |
| Google Maps search (POI) | `https://www.google.com/maps/search/{query}/@{lat},{lng},{zoom}z` |
| Google Maps place (hotel) | `https://www.google.com/maps/search/{address}` |
