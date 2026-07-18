# Waypoint Volunteer — Discovery Engine

**Version:** 0.1  
**Mission:** *What good can I do today?*  
**App:** [`/volunteer/`](../volunteer/)

---

## Purpose

Waypoint Volunteer is a **discovery platform** for meaningful local help — communities, stewardship, and citizen science.

It is **not**:

- Volunteer management software
- Event registration software
- Social media

Helping should feel inviting, never obligatory. No competition, leaderboards, likes, streaks, or guilt-based messaging.

---

## How discovery works

1. **Browse without an account** — catalog + filters + map/list.
2. **Discovery facets** — Near Me, Today, This Weekend, Remote, Family Friendly, Indoors/Outdoors, physical demand, topic chips (Animals, Nature, Trails, Parks, Water, Science, Community, Education, Food Security, Emergency Preparedness, Habitat Restoration).
3. **Today insights** — calm weather/season messages from the rule engine.
4. **Today I can…** — prompt-based recommendations with explicit reasons.
5. **Opportunity pages** — honest detail (what / why / who / time / access / weather / registration).
6. **Organization profiles** — mission and opportunities; **no ratings**.
7. **Saved** — private local lists, notes, completed marks.

---

## Architecture (modular)

| Layer | Files |
|-------|--------|
| Model registries | `volunteer/data/model.js` |
| Catalog + enrichment | `opportunities.js`, `enrichment.js`, `catalog.js`, `organizations.js` |
| Filters | `js/filters.js` |
| Today rules | `js/today-engine.js` |
| Today I Can… | `js/today-i-can.js` |
| Planning | `js/planning.js` (localStorage v2) |
| UI | `index.html`, `cards.js`, `map.js`, `volunteer.js` |
| Detail pages | `opportunity/`, `organization/`, `saved/` |

Shared platform: `styles/site.css`, Leaflet + CARTO (Sheds/ForageCast pattern), Open-Meteo weather context.

---

## Future product integration

| Product | Integration idea |
|---------|------------------|
| **Fieldry** | Optional private journal prompts after a volunteer day; shared place noticing — never required |
| **ForageCast** | Citizen-science phenology / habitat links; seasonal windows as soft context |
| **Dashboard** | Personal “saved nearby” widget — private only |
| **SignalTerrain** | Weather and emergency **awareness** only (not dispatch); indoor/remote suggestions when conditions are harsh |
| **Shared locations** | Reuse spatial precision levels from the knowledge graph |
| **Shared collections** | Future optional export of private lists — still not a social graph |
| **Shared profiles** | Studio identity for sync later; Volunteer remains private-by-default |

Citizen science activities share vocabulary and `sharedApps` hints with Education / Fieldry / ForageCast rather than becoming a separate product.

---

## Related docs

- [Data model](VOLUNTEER-DATA-MODEL.md)
- [Recommendation engine](VOLUNTEER-RECOMMENDATION-ENGINE.md)
- [UX](VOLUNTEER-UX.md)
- [Earlier MVP notes](VOLUNTEER-MVP.md)

**Owner review required before commit.**
