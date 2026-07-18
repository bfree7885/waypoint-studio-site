# Waypoint Volunteer — MVP

**Status:** Open prototype (demo catalog)  
**Mission question:** *What good can I do today?*  
**Path:** [`/volunteer/`](../volunteer/)

---

## Philosophy

Waypoint Volunteer is a **discovery** surface — not volunteer management, not a social network, and not an organization CRM.

The experience aims to feel calm, hopeful, welcoming, and encouraging.

**Never:**

- Guilt the user
- Pressure participation
- Rank people
- Create competition

**None of:**

- Points, streaks, leaderboards
- Followers or public profiles
- Public sharing of personal planning

Personal saves, interests, hides, and lists are **local-first** (browser `localStorage`).

---

## Architecture

Static HTML + CSS + vanilla JavaScript, consistent with Sheds and ForageCast.

```
volunteer/
  index.html                 # Discovery app shell
  data/
    categories.js            # Interest categories + map colors
    organizations.js         # Organization model + demo orgs
    opportunities.js         # Opportunity cards + demo catalog
  js/
    planning.js              # Local-first personal planning
    filters.js               # Distance, time, accessibility, etc.
    today-engine.js          # Recommendation architecture (rules)
    weather-context.js       # Open-Meteo → Today context
    cards.js                 # Opportunity card renderer
    map.js                   # Leaflet map + clustering hook
    volunteer.js             # App orchestration
styles/
  volunteer.css              # Product chrome (map / list / filters)
docs/
  VOLUNTEER-MVP.md           # This document
```

### Shared platform

| Concern | Integration |
|--------|-------------|
| Design tokens / fonts | `styles/site.css` (Cormorant Garamond + Source Sans 3) |
| Map stack | Leaflet 1.9.4 + CARTO Voyager (same as Sheds / ForageCast) |
| Weather | Open-Meteo forecast API (same family as ForageCast) |
| Studio nav | Product links on Home, Fieldry, Education, ForageCast, Waypoint Scenes |
| Knowledge graph | `volunteer` added to entity `apps` enum |

### Data models

**Organization**

- `name`, `mission`, `website`, `volunteerUrl`
- `location` (`label`, `lat`, `lon`, `precision`)
- `contact`, `categories`, `serviceArea`, `verificationStatus`

**Opportunity card**

- Title, organization, category, computed distance
- Estimated commitment, indoor/outdoor, family friendly
- Accessibility, required skills, suggested clothing, seasonality
- Description, official website, application link, map location
- Filter metadata: intensity, weekday/weekend, pet friendly, weather suitability

**Categories**

Environmental Conservation · Wildlife · Citizen Science · Community · Emergency & Resilience · Education

---

## Current capabilities

### Discovery

- Demo catalog (~20 opportunities, 8 organizations) centered on central Pennsylvania
- Reusable opportunity cards with expand/collapse detail
- List / map toggle (responsive; mobile bottom sheet)
- Category-colored map markers + legend
- Locate (geolocation) with graceful fallback to demo region
- Hook for future Leaflet.markercluster (`enableClusteringIfAvailable`)

### Filters

Distance · available time · indoor/outdoor · physical intensity · weekday/weekend · family friendly · pet friendly · accessibility · interest categories · season · weather suitability · match current season · match today’s weather · personal list only

### Today intelligence (architecture)

Pipeline in `today-engine.js`:

1. **Context providers** — weather, forecast, season, daylight remaining, location, available time, interests, mobility prefs  
2. **Rule registry** — declarative insights (no AI)  
3. **Soft scorer** — gentle opportunity ranking for the list  
4. **Presenter** — calm copy for the Today strip  
5. **`registerInsightSource()`** — future AI / external sources plug in here

Example rule messages (non-exhaustive):

- Cool weather → trail / outdoor stewardship comfort  
- Rain likely → indoor opportunities may feel easier  
- Seasonal monarch / pollinator window  
- Weekend cleanup nudge (hopeful, not urgent)

Weather context comes from Open-Meteo when network allows; browsing still works offline of weather.

### Personal planning (local-only)

- Save opportunity  
- Mark Interested  
- Hide opportunity (with restore)  
- Personal list  
- Bookmark organization  

No accounts. No sync. No public feed.

### Accessibility

- Skip link, keyboard focus styles, `aria-*` on controls and dialog  
- Touch-friendly controls  
- Meaningful empty state when filters yield nothing  
- Loading / weather / GPS status text  

---

## Remaining roadmap

| Priority | Item |
|----------|------|
| High | Replace demo catalog with verified regional opportunities |
| High | Organization verification workflow (`verificationStatus`) |
| Medium | Real application deep-links and calendar/ICS hints |
| Medium | Air-quality provider for Today context |
| Medium | Optional MarkerCluster CDN when density grows |
| Medium | Export / import personal planning JSON |
| Lower | Knowledge-graph entities for orgs + opportunities |
| Lower | Multi-region catalogs and service-area polygons |
| Future | AI insight source (must remain optional, calm, non-guilt) |
| Future | Optional account sync — still no social graph |

---

## Known limitations

- Organizations and opportunities are **illustrative demo data** (example.org links).  
- Distances use user location or a central-PA demo center — not production geocoding.  
- Today insights are **rule-based**, not personalized AI.  
- No server, auth, or moderation.  
- Clustering library is not bundled; the map exposes a future hook only.  
- Air quality is modeled in the context shape but not fetched yet.  
- `:has()` is used for checked category chip styling (modern browsers).  

---

## Future integrations

- Partner APIs (VolunteerMatch, local land trusts, Red Cross, iNaturalist projects) — ingest into the opportunity model without changing the discovery UX  
- Open-Meteo air quality / AQI as a Today context field  
- Waypoint knowledge graph nodes for organizations, places, and programs  
- Cross-links from ForageCast / Education topics into related citizen-science opportunities  
- Optional Fieldry journaling prompts after a volunteer day (never mandatory)

---

## Quality checklist (MVP)

| Question | Intent |
|----------|--------|
| Can a first-time visitor understand the mission in under 30 seconds? | Hero line: *What good can I do today?* |
| Does the interface inspire action without pressure? | Soft insights; no scores shown to the user |
| Does it feel like a natural part of Waypoint Studio? | Shared tokens, Leaflet pattern, studio nav |
| Would someone finish exploring feeling hopeful rather than overwhelmed? | Filters + empty states; calm copy; local planning only |

---

Related docs (Discovery Engine v0.1):

- [VOLUNTEER-DISCOVERY.md](VOLUNTEER-DISCOVERY.md)
- [VOLUNTEER-DATA-MODEL.md](VOLUNTEER-DATA-MODEL.md)
- [VOLUNTEER-RECOMMENDATION-ENGINE.md](VOLUNTEER-RECOMMENDATION-ENGINE.md)
- [VOLUNTEER-UX.md](VOLUNTEER-UX.md)

**Owner review required before commit.**
