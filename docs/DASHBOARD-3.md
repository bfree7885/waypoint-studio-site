# Dashboard 3.0

**Product:** Free flagship outdoor mission control  
**Sprint:** RC3 Sprint 3  
**Route:** `/dashboard/`

---

## Purpose

Help someone plan **today’s** outdoor adventure in seconds:

1. See conditions  
2. Read **Waypoint’s Take** — why it matters today  
3. Customize which categories appear  

No repetitive chrome. One brief at the top. One Take per widget.

---

## Widgets

| ID | Title | Default |
|----|-------|---------|
| `weather` | Weather | On |
| `photography` | Photography | On |
| `astronomy` | Astronomy | On |
| `hiking` | Hiking | On |
| `air` | Air Quality | On |
| `rivers` | River Conditions | On |
| `wildlife` | Wildlife | Off |
| `travel` | Travel | Off |
| `roads` | Roads | Off |
| `fishing` | Fishing | Off |
| `fire` | Fire | Off |
| `nightsky` | Night Sky | On |
| `forecast` | Forecast | On |

Users can **enable**, **disable**, and **reorder** widgets. Preferences persist in `localStorage` (`wp-dash-layout-v1`).

---

## Waypoint’s Take

Every widget ends with a Take answering **why it matters today** — educational, calm, never clickbait. Deterministic rules today; future AI can swap the generator without changing the UI contract.

---

## Architecture

| File | Role |
|------|------|
| `dashboard/index.html` | Shell, customize panel, kiosk chrome |
| `dashboard/js/widgets.js` | Catalog + per-widget builders |
| `dashboard/js/engine.js` | Open-Meteo fetch + demo fallback + session cache |
| `dashboard/js/layout.js` | Enable / order persistence |
| `dashboard/js/app.js` | Render, refresh, locate, kiosk |
| `styles/dashboard.css` | Grid, mobile, kiosk |

Conditions cache: `sessionStorage` ~10 minutes. Single weather request + optional air-quality request.

---

## Kiosk mode

- Large typography  
- Live clock  
- Auto-refresh every 5 minutes  
- Hides marketing header/footer and customize panel  
- Escape or **Exit kiosk** to leave  
- Requests fullscreen when available  

---

## Privacy & honesty

- Layout and cache stay on-device  
- Geolocation only when the user clicks **Use my location**  
- Fire / travel cards are awareness — not dispatch  
- River figures may be modeled for demo regions  
- Provider: Open-Meteo (when reachable)

---

## Testing

- `node tests/smoke.js` — routes + dashboard module load  
- Manual: customize reorder, disable all (empty state), kiosk Escape, locate deny → demo  

---

## Related

- [AURORA-DESIGN-SYSTEM.md](./AURORA-DESIGN-SYSTEM.md)  
- [RC3-CONSTITUTION.md](./RC3-CONSTITUTION.md)  
- [PRODUCTS.md](./PRODUCTS.md)
