# TourSmart — Design System

## Concept
Dark, crew-facing tool. Aesthetic draws from AC/DC's visual language: bold, industrial, no fluff. The **⚡ bolt** is the only decorative element — used sparingly (wordmark, animate button). Everything else is typographic restraint.

## CSS custom properties
```css
--ink:        #0a0a0b   /* canvas / near-black background */
--steel-900:  #141416   /* surface level 1 */
--steel-800:  #1c1c1f   /* surface level 2 */
--steel-700:  #26262a   /* borders, dividers */
--red:        #d4262a   /* AC/DC red — primary accent (route, active state, tags) */
--gold:       #e8b53a   /* PWR/UP gold — active label, favourites, highlights */
--bone:       #e8e6e1   /* primary text, warm off-white */
--ash:        #8a8a90   /* muted text, labels, secondary info */
```

## Typography
| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Display / wordmark | Oswald | 700 | Wordmark, city names (active label), section headers |
| Data / mono | Space Mono | 400/700 | Show sheet values, city labels (resting), map hints, tags |
| Body | Inter | 400/500/600 | Guide text, notes, modal body copy |

## Component styles

### Markers
- Resting: grey (`var(--ash)`) circle, show number in Space Mono
- Mobile: 16 px diameter, 1.5 px border, 6 px font
- Desktop: 32 px diameter, 2 px border, 9 px font
- Active: gold border + gold text (`.active` class on icon element)

### City labels (Leaflet tooltips)
- Resting: 8 px Space Mono uppercase, `var(--ash)`, transparent background, text-shadow for legibility
- Active: 12 px Oswald bold, `var(--bone)`, dark background `rgba(10,10,11,.9)`, gold border 1.5 px, gold glow
- Mobile active: 10 px

### Route polyline
- Resting / static: `var(--red)` at 40% opacity, weight 1.5
- During animation: `var(--red)` at full opacity, weight 2.5
- Charter mini-map: dashed (dashArray `6,6`)

### Timeline rows
- Month header: 16 px Oswald bold, `var(--bone)`
- Week header: 9 px Space Mono, `var(--ash)`, full-width rule
- Row date: Oswald, day number large + weekday abbreviation small
- Row tag: coloured chip — `BUS` amber `#c2954f`, `CHARTER` blue `#6f9fd0`, `TRAVEL` grey `#8a8a90`, show days get a custom red/gold treatment
- Row title/subtitle: Oswald medium + Inter small grey

### Modals
- Full-screen overlay on mobile, centred card on desktop
- Gold stripe (`var(--gold)`) for shows with guides; custom colour for travel modes
- `section-label`: 9 px Space Mono letter-spaced uppercase, `var(--ash)`
- `show-cell`: mono grid for show sheet data
- `travel-sub-note`: 10 px `var(--ash)`, informational sub-label

### Burger menu dropdown
- `rgba(20,20,22,.96)` background, `var(--steel-700)` border, 4 px border-radius
- Opens with scale+fade animation (transform-origin: top right)

### Timeline drawer (mobile)
- Handle: 58 px tall, centred pill `#tl-handle-bar` (44 × 4 px)
- Collapsed: `translateY(calc(100% - 58px))` — only handle visible
- Expanded: `translateY(0)` — full height (62 vh)
- `tl-expanded` class on `#timeline-view` → bar turns red, label turns red

## Responsive layout
```
Portrait mobile (≤639 px):
  - Map: fullscreen (right: 0)
  - Timeline: bottom drawer, swipeable
  - Controls: burger menu

Desktop / landscape tablet (≥640 px):
  - Map: left panel, right: 360 px (--tl-w)
  - Timeline: fixed 360 px right column
  - Controls: direct buttons (or burger if ≤1180 px in landscape)

Landscape phone (≤500 px height):
  - Header: compact (16 px wordmark, tight margins)
  - Vignette: 80 px instead of 120 px
```
