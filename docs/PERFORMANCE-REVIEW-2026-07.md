# Performance Review — July 2026

## Measured / observed

| Asset | Size | Impact |
|-------|------|--------|
| `boardwalk.jpg` (root + scenes) | ~13 MB each | Severe mobile cost; largest P2 issue |
| `fogforest.jpg` | ~5.7 MB | High |
| `ws0001.jpg` | ~2.8 MB | High for archive scene |
| `counties.data.json` | ~50 KB | Fine |
| Leaflet CDN | Shared | Network dependency |

No bundler; many small JS files on Volunteer (acceptable for clarity).

## Improvements this block

- Documented image weight as known limitation.  
- Removed missing audio fetches (failed requests).  
- Noscript avoids implying broken interactivity.

## Not done (needs owner assets / tooling)

- Re-encode hero images (WebP/AVIF, responsive `srcset`).  
- Deduplicate root vs `waypoint-scenes/` copies.  
- Font self-hosting.  
- Map tile caching strategy.

## Resilience

- Weather failures degrade Volunteer Today insights.  
- Geolocation denial falls back to demo center.  
- Sheds offline banner exists.  
- No service worker (no stale-SW risk; also no offline shell).
