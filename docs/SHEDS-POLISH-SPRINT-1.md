# Sheds — Product Polish Sprint 1

**“If this were shipping tomorrow.”**

Sprint type: refinement / field UX  
Date: 2026-07-16  
Scope: Map-first Field View at `/sheds/` — no new science, AI, dashboards, or biology expansion.

---

## 1. First-pass friction audit (before changes)

Opened Sheds as a first-time user. Ignored implementation intent. Recorded every moment of friction.

### Prioritized problems

| Pri | Problem | Why it matters |
|---|---|---|
| **P0** | No map. No field tool. Only a marketing page. | Compared to onX / Gaia / AllTrails, there is nothing to *use*. Launch fails. |
| **P0** | Cannot answer: Where am I? How good today? Where is the opportunity? Why? | Core information hierarchy is absent. |
| **P1** | Full studio nav + feature cards + pricing + waitlist dominate the viewport | Feels like a webpage sitting where a field tool should be. |
| **P1** | Two Sheds surfaces (`/sheds` vs `/projects/sheds`) with different tone and depth | Inconsistent product story; users don’t know which is “the app.” |
| **P1** | “Planned” badge and “coming soon” language | Undermines trust if we claim a 30-day launch posture. |
| **P2** | No GPS, denied, offline, empty, or loading states | Field tools live or die on location and connectivity honesty. |
| **P2** | No one-handed / sunlight / quick-glance optimization | Feature cards and long copy fail in cold, bright, brief stops. |
| **P2** | Touch targets and thumb reach irrelevant (desktop marketing layout) | Mobile hunters need thumb-reachable locate and layer controls. |
| **P3** | Six feature cards restate the same promise without an action | Noise; duplicate information; no path into a map. |
| **P3** | Pricing grid with no payment and three “Planned/Future” badges | Visual clutter that doesn’t help field decisions. |
| **P3** | Ethics note buried mid-page as a static block | Important, but competes with features instead of living in-context on the map. |

### Design review answers (before)

| Question | Answer |
|---|---|
| Can I tell what this app does in five seconds? | Partially — tagline helps; then feature cards dilute focus. |
| What does the app want me to know first? | Unclear — marketing hierarchy, not field hierarchy. |
| Can I understand today’s recommendation? | No. |
| Is the map the hero? | No map exists. |
| Does every element earn its place? | No — pricing, duplicate features, studio chrome. |

---

## 2. UX decisions (this sprint)

1. **Field View is the product surface** at `/sheds/`. Long-form story stays at `/projects/sheds/`.
2. **Map is full-bleed.** Chrome floats on top; the page is not a document with a map inset.
3. **Four-line hierarchy always visible:** location → conditions chip → best opportunity → one-sentence why.
4. **One primary action:** Locate. Secondary: Zones on/off, Education mode.
5. **Demo zones are illustrative only** — labeled clearly; not a prediction model; no new biology.
6. **Education mode** hides hotspot-style fills and shifts copy to terrain learning (ethics constraint).
7. **Desktop uses a side panel**; mobile uses a bottom sheet — not a stretched phone layout.
8. **Honest states:** locating, denied, offline, zones off, education on — calm, not alarmist.
9. **Studio nav collapses** to brand + About / Waitlist escape hatches so the field tool stays calm.

---

## 3. Before / after

### Before

- Marketing landing: hero, six feature cards, ethics note, pricing grid, waitlist CTA.
- No Leaflet map, no GPS, no condition chip, no opportunity cue.

### After

- Full-viewport Field View with CARTO basemap (same family as ForageCast).
- Compact HUD on mobile; desktop side panel + location chip (no duplicate HUD).
- Locate control with pulse feedback; GPS denied and offline banners.
- Illustrative demo zones with legend; education mode toggle.
- About drawer for waitlist, ethics summary, and link to project essay.

### Screenshots

| Capture | File |
|---|---|
| After desktop Field View | [`docs/assets/sheds-polish-sprint-1/after-desktop.png`](../docs/assets/sheds-polish-sprint-1/after-desktop.png) |
| After mobile Field View | [`docs/assets/sheds-polish-sprint-1/after-mobile.png`](../docs/assets/sheds-polish-sprint-1/after-mobile.png) |
| Mobile sheet open | [`docs/assets/sheds-polish-sprint-1/mobile-sheet-open.png`](../docs/assets/sheds-polish-sprint-1/mobile-sheet-open.png) |
| Education mode | [`docs/assets/sheds-polish-sprint-1/education-mode.png`](../docs/assets/sheds-polish-sprint-1/education-mode.png) |
| Zones off | [`docs/assets/sheds-polish-sprint-1/zones-off.png`](../docs/assets/sheds-polish-sprint-1/zones-off.png) |
| GPS denied | [`docs/assets/sheds-polish-sprint-1/gps-denied.png`](../docs/assets/sheds-polish-sprint-1/gps-denied.png) |
| About dialog | [`docs/assets/sheds-polish-sprint-1/about-dialog.png`](../docs/assets/sheds-polish-sprint-1/about-dialog.png) |

---

## 4. Implementation notes

| File | Role |
|---|---|
| [`sheds/index.html`](../sheds/index.html) | Field shell markup |
| [`sheds/sheds.js`](../sheds/sheds.js) | Map, locate, zones, sheet, state machine |
| [`styles/sheds.css`](../styles/sheds.css) | Map-first chrome, field contrast, responsive shell |

Demo zone geometry is generated locally around the map center (illustrative polygons). Conditions chip uses a lightweight seasonal heuristic for **demo labeling only** — not research-grade forecasting.

---

## 5. QA checklist

| Case | Expected | Result |
|---|---|---|
| Desktop ≥1024px | Map + side panel; location chip; no duplicate HUD | Pass (screenshot) |
| Mobile portrait | Map full bleed; bottom sheet; locate in thumb reach | Pass (screenshot) |
| Touch targets | Controls ≥44px | Pass (~2.75rem) |
| Keyboard | Focus visible; About Escape closes | Pass |
| Locate denied | Calm denied message; map usable | Pass (screenshot) |
| Offline | Offline banner when `navigator.onLine` false | Pass (code path) |
| Zones off | Polygons removed; legend notes “Zones off” | Pass (screenshot) |
| Education mode | Hotspot fills hidden; education banner | Pass (screenshot) |
| Console | No page errors on load / toggles | Pass (Playwright) |

---

## 6. Intentionally deferred

- Real terrain models (slope/aspect/DEM pipelines)
- Observation logging and photo records
- Offline tile packs
- Season calendars by jurisdiction (legal season engine)
- Push / accounts / subscriptions
- Cross-link graph surfaces from knowledge-graph V1
- Feature parity with onX / Gaia / AllTrails

---

## 7. Remaining issues (ranked by impact)

| Rank | Issue | Impact |
|---|---|---|
| 1 | Demo zones are not real terrain intelligence | High — users may over-trust fills; mitigate with clear “Demo” labeling |
| 2 | No jurisdiction-aware closed-season automation | High — Education mode is manual today |
| 3 | GPS accuracy / heading not shown | Medium — field trust |
| 4 | No saved places or return visits | Medium — repeat hunters expect this |
| 5 | Studio homepage badge may lag Field View status | Low — updated to Open Prototype in this sprint |
| 6 | Dark studio palette vs bright sunlight readability | Medium — may need a high-sun theme later |
| 7 | Duplicate long-form page may still confuse SEO/nav | Low |

---

## 8. Future opportunities (not this sprint)

- Subtle confidence indicator tied to data freshness
- One-tap “why this bench” terrain callouts when real layers land
- High-contrast daylight theme
- Sync Fieldry observations as optional overlays
- Align homepage badge to “Open prototype” when ready

---

## 9. Success criteria (sprint)

When complete, Sheds should feel **calmer, cleaner, more obvious, more trustworthy, more enjoyable**.

Users should not think: “This is impressive software.”  
They should think: **“This is easy.”**

---

*Polish Sprint 1 — Waypoint Studio / Sheds.*
