# TourSmart — Data Reference

All data is embedded directly in `index.html`. The `data/` folder contains legacy JSON files from before the build — they are **not used by the app** and may be out of date.

## SHOWS
```js
const SHOWS = [ { n, city, region, country, venue, venueType, date, capacity,
                  doors, prettyReckless, acdc, curfew, hotel, lat, lng, hasGuide }, … ]
```

| Field | Type | Notes |
|-------|------|-------|
| `n` | int | Show number 1–18, used as primary key throughout |
| `city` | string | Display city name (e.g. "San Francisco" for Levi's Stadium, Santa Clara) |
| `region` | string | State/province abbreviation |
| `country` | string | "USA" or "Canada" |
| `venue` | string | Full venue name |
| `venueType` | string | `"outdoor"` \| `"indoor"` \| `"field"` |
| `date` | string | ISO 8601 e.g. `"2026-07-11"` |
| `capacity` | int | Venue capacity |
| `doors` | string | Local time e.g. `"18:00"` |
| `prettyReckless` | string | Support set window e.g. `"19:30–20:30"` |
| `acdc` | string | AC/DC set start e.g. `"21:00"` |
| `curfew` | string | Local curfew time |
| `hotel` | `{ name, address }` | Crew hotel; `address` used for Google Maps link |
| `lat`, `lng` | float | Venue coordinates |
| `hasGuide` | bool | Always `true` for all 18 shows |

### All 18 shows
| # | City | Date | Venue |
|---|------|------|-------|
| 1 | Charlotte, NC | 2026-07-11 | Bank of America Stadium |
| 2 | Columbus, OH | 2026-07-15 | Ohio Stadium |
| 3 | Madison, WI | 2026-07-19 | Camp Randall Stadium |
| 4 | San Antonio, TX | 2026-07-24 | Alamodome |
| 5 | Denver, CO | 2026-07-28 | Empower Field at Mile High |
| 6 | Las Vegas, NV | 2026-08-01 | Allegiant Stadium |
| 7 | San Francisco, CA | 2026-08-05 | Levi's Stadium (Santa Clara) |
| 8 | Edmonton, AB | 2026-08-09 | Commonwealth Stadium |
| 9 | Vancouver, BC | 2026-08-13 | BC Place Stadium |
| 10 | Atlanta, GA | 2026-08-27 | Mercedes-Benz Stadium |
| 11 | Houston, TX | 2026-08-31 | NRG Stadium |
| 12 | Notre Dame, IN | 2026-09-04 | Notre Dame Stadium |
| 13 | St. Louis, MO | 2026-09-08 | The Dome at America's Center |
| 14 | Montréal, QC | 2026-09-12 | Parc Jean-Drapeau |
| 15 | Toronto, ON | 2026-09-16 | Rogers Stadium |
| 16 | Winnipeg, MB | 2026-09-20 | Princess Auto Stadium |
| 17 | East Rutherford, NJ | 2026-09-25 | MetLife Stadium |
| 18 | Philadelphia, PA | 2026-09-29 | Lincoln Financial Field |

## GUIDES
```js
const GUIDES = {
  "1": { city, hotelNote, food, coffee, bars, sights, nature, dayoff },
  …
  "18": { … }
}
```

Each city object:
```js
{
  city: "Charlotte",
  hotelNote: "Short walk to Uptown...",
  food:    [ { name, note, tag? }, … ],   // tag: "late" | "dayoff" | "walk" | "🌟"
  coffee:  [ … ],
  bars:    [ … ],
  sights:  [ … ],
  nature:  [ … ],
  dayoff:  [ … ]
}
```

All 18 cities are fully populated. `tag` is optional; used for chips in the guide list.

## DAYS (itinerary)
```js
const DAYS = [ { date, type, city, region, stopN?, note?, from?, to?, roadMiles?, hours? }, … ]
```

| Field | Type | Notes |
|-------|------|-------|
| `date` | string | ISO 8601 |
| `type` | string | `"travel"` \| `"show"` \| `"load-in"` \| `"tech"` \| `"rehearsal"` \| `"day-off"` |
| `city` | string | City name (matches `SHOWS[].city` for show-city days) |
| `region` | string | State/province |
| `stopN` | int? | Links to `SHOWS[].n`; null for pre-tour / transit days |
| `note` | string? | Free-text note; used by `detectTravelMode` to identify bus/charter |
| `from` | string? | Departure city name (travel days) — must match a `SHOWS[].city` |
| `to` | string? | Destination city name (travel days) — must match a `SHOWS[].city` |
| `roadMiles` | int? | Bus travel distance in miles (used for drive-time estimate) |
| `hours` | string? | Estimated drive time string e.g. `"10.5"` |

87 days total: 2026-07-06 through 2026-09-29.

## TRAVEL_CFG
```js
const TRAVEL_CFG = {
  bus:     { label: 'BUS',     icon: '🚌', color: '#c2954f', iconStyle: 'font-size:9px;' },
  charter: { label: 'CHARTER', icon: '✈',  color: '#6f9fd0', iconStyle: '' },
  travel:  { label: 'TRAVEL',  icon: '✈',  color: '#8a8a90', iconStyle: '' }
}
```

## Favourites (localStorage)
Key: `toursmart_favs`

```js
{
  "<n>::<cat>::<name>": { id, city, cat, name, done: bool },
  …
}
```

`cat` is one of: `food`, `coffee`, `bars`, `sights`, `nature`, `dayoff`.
