# Sheds 3.0 — Flagship Field Experience

**Sprint:** RC3 Sprint 5  
**Route:** `/sheds/`  
**Status:** Open Prototype — map-first field tool  
**Authority:** [RC3-CONSTITUTION.md](./RC3-CONSTITUTION.md) · prior polish: [SHEDS-POLISH-SPRINT-1.md](./SHEDS-POLISH-SPRINT-1.md)

---

## Intent

Sheds is a **flagship** product equal in stature to Scenes. Sprint 5 deepens the existing map-first Field View — it does **not** invent a competing architecture. Demo zones remain illustrative; language stays ethical and calm.

---

## What shipped

| Area | Capability |
|------|------------|
| **Map** | CARTO basemap, demo interest zones, prediction teaching tint, regulation reminder pin |
| **Search** | Demo place search (curated Northeast-oriented locations; no live parcel data) |
| **Today’s read** | Seasonal condition chip, opportunity, one-sentence why |
| **Waypoint’s Take** | Aurora Take panel explaining *why* conditions favor learning or walking — never vanity scores alone |
| **Seasonality** | 12-month demo calendar with peak / early / late / off phases |
| **Education** | Field library: deer behavior, habitat, food, terrain, weather, timing |
| **Observations** | Private localStorage notes pinned at map center; clear-all; no sync |
| **Ethics** | Education mode hides hotspot + prediction fills; regulation copy defers to agencies |
| **Mobile UX** | Large touch targets (~2.85rem), bottom sheet, thumb-reach controls, `prefers-reduced-motion` |
| **Offline** | Online/offline banner; cached last Take/read in localStorage (no service worker — consistent with site) |
| **GPS** | User-initiated locate only; denied/timeout states stay calm |

---

## Files

| Path | Role |
|------|------|
| `sheds/index.html` | Field shell, tabs (Today / Learn / Notes), search, layers |
| `sheds/sheds-data.js` | Education, seasonality, regulations, Take builders, demo places |
| `sheds/sheds.js` | Map, layers, observations, prefs, offline cache |
| `styles/sheds.css` | Aspen gold / evergreen field chrome on Aurora `theme-sheds` |

---

## Privacy & ethics

- Geolocation runs only when the user taps **Locate**.
- Observations and layer prefs stay in `localStorage` (`wp-sheds-field-v1`).
- No fake live property boundaries or find guarantees.
- Regulation text is educational — users must verify with their state wildlife agency.

---

## Design

Refines Aurora Sheds tokens: aspen gold, evergreen, burnt orange, bark — autumn field atmosphere via restrained gradients, not a new design system. Waypoint’s Take uses the shared `.aurora-take` contract (italic display body, left accent, calm footer).

---

## Testing

```bash
node tests/smoke.js
```

Smoke covers Sheds routes, data module exports, Take builder tone, and HTML markers for Take / education / search.

---

## Known limitations

1. Demo zones and prediction tint are **not** DEM/aspect science.
2. Season calendar is Northeast-oriented demo — not jurisdiction automation.
3. Search is curated demo places only (no Nominatim dependency in this sprint).
4. No offline tile packs; map tiles need network.
5. No accounts, photo attachments, or cloud sync for observations.
6. High-sun / daylight theme still deferred.

See also [KNOWN-LIMITATIONS.md](./KNOWN-LIMITATIONS.md).

---

## Success criteria

Users should feel: *calm, clear, trustworthy, field-ready* — not “impressive software.”  
Waypoint’s Take should answer **why today**, without clickbait or numeric vanity scores alone.

---

*RC3 Sprint 5 — Waypoint Studio / Sheds 3.0.*
