# 🎸 TourSmart — Projekt-Handoff (AC/DC PWR/UP Tour 2026)

> **Für einen neuen Chat / Cowork:** Lies dieses Dokument + `docs/BUILD_SPEC.md`, dann nutze `data/shows.json` und `data/guides.json`. Stelle klärende Fragen **immer als Multiple Choice**. Ändere nur, woran gerade gearbeitet wird.

## 1. Wer & Arbeitsweise
- **Michael** — Senior Lighting Designer & Screen Director, AC/DC PWR/UP Tour 2026. Mac. Grundkenntnisse Java/HTML/Python/Lua, kein Programmierer.
- **Design:** zeitgemäß, **„less is more"**, klar/stark/ausdrucksstark. Konsistenz; nur das Bearbeitete ändern.
- **STEHENDE REGEL:** Klärende Fragen während der App-Entwicklung **immer als Multiple Choice / tappbar**.

## 2. Was wir bauen
Selbst-gehostetes **Tour-Companion-Tool** als **einzelne HTML-Datei**: dunkle interaktive Karte aller 17 Shows / 18 Stops, Route mit Umschalter (animiert ↔ statisch), pro Stadt volle Show-Daten + kuratierter Guide, Favoriten-/To-Do-System (privat + später gemeinsame Crew-Liste).

## 3. Entscheidungen (LOCKED)
- Look: schwarz/Steel, AC/DC-Rot + PWR/UP-Gold, Blitz-Slash ⚡ als Signatur → Details in `docs/BUILD_SPEC.md`.
- Karte: **Leaflet + CartoDB `dark_matter`** (kein API-Key).
- Route: Umschalter **animiert ↔ statisch**.
- Datentiefe: **voll** (Venue, Kapazität, Doors, Set-Times, Curfew).
- Guide-Fokus: **gemischt** — Crew-Realität (nah am Hotel, spät offen) **und** Off-Tag-Highlights; alle Kategorien.
- Favoriten: **localStorage + Export/Import-JSON**; privat jetzt, gemeinsame Crew-Liste später.
- Login: **erst ohne**, später erweitern.
- Architektur: **Hybrid** — statisch/self-hosted jetzt; Backend-fähig vorbereitet (Login + Live-„open now"-Daten später; API-Key darf nie offen im Client liegen).
- Datei: **eine `index.html`**.
- Extra: **KML-Export** für Google My Maps (späteres Nebenprodukt).

## 4. Bau-Vorgehen
**Prototyp zuerst** mit **Charlotte + Las Vegas + Montréal** (in `guides.json` voll bestückt) → Michaels Freigabe zu Look & Bedienung → **dann** alle 18 füllen.

## 5. GitHub
Repo: **https://github.com/keptnahab/TourSmart.git** — Versionierung + geräteübergreifend + spätere Backend-Andockung.

## 6. Status JETZT
- ✅ Anforderungen vollständig geklärt; Design-Token & Build-Spec festgelegt.
- ✅ Alle 18 Stops als `data/shows.json` (Koordinaten, Show-Daten, Hotels).
- ✅ Guides der 3 Prototyp-Städte in `data/guides.json`; 15 weitere als leere Platzhalter.
- ⏳ Hintergrund-Recherche für die übrigen 15 Städte lief im Ursprungs-Chat (Essen/Kaffee/Bars/Sights/Natur/Off-Tag, nah an den Crew-Hotels) — Ergebnisse dort abgreifen und in `guides.json` einpflegen.
- ⬜ `index.html`-Prototyp noch zu bauen (in Cowork).

## 7. Dateien in diesem Paket
```
TourSmart/
├─ README.md                 Projekt-Übersicht
├─ .gitignore
├─ docs/
│  ├─ TourSmart_Handoff.md   dieses Dokument
│  └─ BUILD_SPEC.md          Design-Token + Komponenten-Spec + Bauschritte
└─ data/
   ├─ shows.json             alle 18 Stops (Koordinaten, Show-Daten, Hotels)
   └─ guides.json            Guides (3 Städte befüllt, 15 Platzhalter)
```
> `index.html` wird in Cowork erzeugt und kommt ins Repo-Root.

## 8. Nächster Schritt
In Cowork: `index.html`-Prototyp nach `docs/BUILD_SPEC.md` bauen (3 Städte voll, Rest als Marker + „Guide folgt"). Fragen ausschließlich als Multiple Choice.
