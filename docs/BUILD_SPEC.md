# TourSmart — Build Spec (Prototyp)

Konkrete Bauanweisung für Cowork. Halte dich exakt daran; ändere nur, woran gerade gearbeitet wird.

## Ziel dieses Schritts
Funktionierender **Prototyp** mit **3 Städten** (Charlotte, Las Vegas, Montréal) voll bestückt, die übrigen 15 Stops als Marker + „Guide folgt". Erst nach Michaels Freigabe alle 18 füllen.

## Tech
- **Eine einzelne `index.html`** (Inline-CSS + JS). Selbst-hostbar, offline-tolerant (Inhalte funktionieren ohne Netz; nur die Kartenkacheln brauchen Internet).
- **Karte: Leaflet** (CDN) mit **dunklem Theme** über **CartoDB `dark_matter`**-Tiles — **kein API-Key nötig** (wichtig: passt zur No-Backend-Phase).
- Daten aus `data/shows.json` und `data/guides.json` (im Prototyp dürfen sie der Einfachheit halber direkt in die HTML eingebettet werden; Struktur 1:1 übernehmen).

## Design-Token (geerdet in der Tour, nicht generisch)
Farben:
- `--ink: #0a0a0b`   (Canvas, fast schwarz)
- `--steel-900: #141416`, `--steel-800: #1c1c1f`, `--steel-700: #26262a` (Flächen — „CREW/STEEL")
- `--red: #d4262a`   (AC/DC-Rot — Route, Marker, Primär-Akzent)
- `--gold: #e8b53a`  (PWR/UP-Gold — Favoriten/aktiv, Sekundär-Akzent)
- `--bone: #e8e6e1`  (Haupttext, warmes Off-White)
- `--ash: #8a8a90`   (gedämpfter Text/Labels)

Typografie:
- Display: **Oswald** (500/600/700) — verdichtet, Stencil-nah; für Stadtnamen, Wortmarke.
- Daten/Technik: **Space Mono** (400/700) — für Show-Sheet-Werte (Doors/Set/Curfew/Capacity). Wirkt wie ein Crew-Sheet.
- Fließtext: **Inter** (400/500/600).

Signatur:
- Der **Blitz-Slash ⚡** ist das *einzige* markante Element: Wortmarke `TOUR⚡SMART`, optional als Richtungsmarker der Route. Sonst überall Zurückhaltung („less is more").

## Layout
- Vollflächige dunkle Karte als Canvas.
- **Oben links:** Wortmarke `TOUR⚡SMART` + kleine Zeile „AC/DC PWR/UP · CREW COMPANION".
- **Oben rechts:** Button **Steel List (n)** (Favoriten) + Route-Umschalter **⚡ Animate / Static**.
- **Marker:** runde Steel-Marker mit Show-Nummer, roter Rand; Städte mit Guide bekommen **goldenen Rand**. Hover → Tooltip „Stadt · Datum".
- **Klick auf Marker → Panel** (rechts als Drawer auf Desktop, unten als Bottom-Sheet auf Mobile):
  - Eyebrow (mono): `SHOW 01 · 11 JUL 2026`
  - Stadt (Oswald, groß) + Venue + Venue-Typ
  - **Show-Sheet** (mono-Grid): Doors · The Pretty Reckless · AC/DC · Curfew · Capacity
  - Crew-Hotel-Zeile
  - **Guide** nach Kategorien (Food/Coffee/Bars/Sights/Nature/Day-Off). Jede Zeile: ☆ Favoriten-Toggle (gold wenn aktiv) · Name · Notiz · optional Tag-Chip (late/dayoff/walk) · ✓ erledigt-Toggle (durchgestrichen).

## Route-Mechanik
- Polyline in `--red`, weight ~2.5, opacity ~0.7, verbindet die 18 Stops in Tour-Reihenfolge.
- **Animate:** Segmente zeichnen sich nacheinander (kleiner Delay je Segment). `prefers-reduced-motion` respektieren → dann direkt statisch.
- **Static:** komplette Linie + alle Marker sofort.

## Favoriten / Steel List
- Speicherung: **`localStorage`** (key `toursmart_favs`) **+ Export/Import als JSON**. In try/catch kapseln, In-Memory-Fallback, damit nichts crasht.
- Datensatz pro Favorit: `{ id: "<n>::<cat>::<name>", city, cat, name, done }`.
- Steel-List-Panel: Favoriten nach Stadt gruppiert, abhakbar (`done`), einzeln entfernbar, **Export** (Download JSON) + **Import** (Datei-Merge).
- Export-Format ist bewusst die Brücke zur späteren gemeinsamen Crew-Liste + Backend.

## Qualitäts-Boden
- Responsiv bis Mobile (Panel = Bottom-Sheet).
- Sichtbarer Keyboard-Fokus; Buttons echte `<button>`.
- `prefers-reduced-motion` respektiert.
- CSS-Spezifität sauber halten (keine sich aufhebenden Section-Paddings).

## Danach
Nach Freigabe: Recherche-Ergebnisse in `guides.json` für die übrigen 15 Städte einpflegen, dann KML-Export (Google My Maps) ergänzen.
