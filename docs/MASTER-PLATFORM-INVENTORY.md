# Master Platform Inventory

**Date:** 2026-07-17  
**Repo:** `waypoint-studio-site`  
**Stack:** Static multi-page HTML / CSS / vanilla JS (no package manager, no build step, no framework)

This inventory describes the **actual** repository, not aspirational architecture.

---

## What exists

### Studio shell

| Route | Status |
|-------|--------|
| `/` | Homepage (product catalog) |
| `/about/` | Archive-style about (older `styles.css`) |
| `/privacy/` | Privacy philosophy page (**added this audit**) |
| `/contact/` | Contact / email (**added**) |
| `/support/` | Redirects to Contact (**added**) |
| `/404.html` | Not-found page (**added**) |
| `/robots.txt`, `/sitemap.xml` | Crawler basics (**added**) |

### Interactive / product surfaces

| Route | Status | Notes |
|-------|--------|-------|
| `/waypoint-scenes/` | Active prototype | Two-scene interactive photography |
| `/foragecast/` | Open beta | Weather reads, heatmap, forms, Learn |
| `/foragecast/education/` | Live | Species catalog |
| `/sheds/` | Open prototype | Leaflet Field View + demo zones |
| `/volunteer/` | Open prototype | Discovery Engine v0.1 |
| `/volunteer/opportunity/` | Live | Detail by `?id=` |
| `/volunteer/organization/` | Live | Org profile by `?id=` |
| `/volunteer/saved/` | Live | Private localStorage planning |
| `/fieldry/` | Planned landing | No app yet |
| `/education/` | Early foundation | Landing + topic placeholders |
| `/knowledge-graph/` | Schema / docs / examples | Not a public end-user app UI |

### Archive IA (older nav)

`/projects/`, `/gallery/`, `/workshop/`, education topics, podcast/articles placeholders.

### Shared assets

| Path | Role |
|------|------|
| `styles/site.css` | Primary product design system |
| `styles/styles.css` | Older archive system |
| `styles/foragecast.css`, `foragecast-education.css`, `sheds.css`, `volunteer.css` | Product chrome |
| `shared/a11y-dialog.js` | Dialog focus trap helper (**added**) |
| `assets/species/` | ForageCast SVG placeholders |

---

## What does **not** exist in this repo

No public routes / implementations for:

- Dashboard / Today Outside
- Photo Coach / Photographer Profile
- SignalTerrain Radio & Spectrum
- SignalTerrain Cyber Awareness
- Steepleaf
- Savant Sommelier
- Landscape Interpretation
- Hidden Landscapes app
- Shared profile / locations / collections / settings
- Service workers, web manifests, IndexedDB layers
- `package.json`, CI workflows, automated browser e2e (beyond `tests/smoke.mjs`)
- Custom domain `CNAME` (deleted historically)

Homepage now lists these under **Long-term direction** with an explicit “not available” disclaimer.

---

## Data providers & third parties

| Provider | Used by |
|----------|---------|
| Open-Meteo (forecast, geocoding, elevation) | ForageCast, Volunteer |
| Leaflet 1.9.4 + CARTO tiles | Sheds, ForageCast, Volunteer |
| Google Fonts | Most product pages |
| Formspree | ForageCast beta/waitlist/feedback |
| `mailto:` | Waitlists / contact |

No analytics trackers found in-repo.

---

## Client storage

| Key / system | App |
|--------------|-----|
| `waypoint-volunteer-planning-v2` (+ v1 migrate) | Volunteer |
| ForageCast beta dismiss flag | ForageCast |

Geolocation: Sheds, ForageCast, Volunteer (user-initiated).

---

## Maps

Leaflet on Sheds, ForageCast heatmap, Volunteer discovery.

---

## Forms

ForageCast beta, waitlist, feedback → Formspree endpoint in `foragecast/forms.config.js`.

---

## Duplication / debt

- Product nav HTML copied per page (no shared partials — static hosting).
- Two CSS systems (`site.css` vs `styles.css`).
- Large hero JPEGs (~13MB / ~5.7MB) duplicated at root and under `waypoint-scenes/`.
- Archive gallery/workshop still use “Placeholder” tiles.

---

## Deploy posture

GitHub Pages–style static hosting expected (`bfree7885/waypoint-studio-site`).  
Live `*.github.io` probe from this environment returned **403** (cannot verify public deploy parity here).
