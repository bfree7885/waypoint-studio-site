# Waypoint Volunteer — Data Model (v0.1)

Canonical registries live in [`volunteer/data/model.js`](../volunteer/data/model.js).  
Demo records are normalized at load via [`volunteer/js/catalog.js`](../volunteer/js/catalog.js).

---

## Core entities

### Organization

| Field | Notes |
|-------|--------|
| `id`, `name`, `mission` | Required identity |
| `website`, `volunteerUrl` | External links |
| `location` | `{ label, lat, lon, precision }` |
| `contact` | Email/phone; may be null |
| `categories` | Studio category ids |
| `serviceArea` | Human-readable |
| `verificationStatus` | `demo` \| `unverified` \| `community` \| `partner` \| `official` |
| `supportedCauses` | Plain labels — **no ratings** |
| `accessibility` | Summary + notes |
| `recurringEvents`, `seasonalWork` | Informational lists |

### Opportunity

| Field | Notes |
|-------|--------|
| `id`, `title`, `organizationId` | Required |
| `opportunityType` | See types below |
| `category` | Discovery category |
| `discoveryTags` | Facet topics (`animals`, `trails`, …) |
| `whatYoullDo`, `whyItMatters`, `whoBenefits` | Honest narrative |
| `description` | Short card blurb (legacy-compatible) |
| `durationMinutes`, `estimatedCommitment` | Time |
| `physicalDemand` | `light` \| `moderate` \| `vigorous` |
| `indoorOutdoor`, `remote` | Setting |
| `accessibility`, `ageRequirements` | Access |
| `skills`, `equipment` | Requirements |
| `seasonality`, `weatherSuitability`, `weatherSensitivity` | Context |
| `schedule` | `{ kind, hint }` — one-time / recurring / ongoing / seasonal |
| `registrationRequired`, `registrationNotes` | Signup honesty |
| `verificationStatus`, `source` | Provenance |
| `isCitizenScience`, `citizenScienceProgram` | Science bridge |
| `sharedApps` | Hints: foragecast, fieldry, education, … |
| `lat`, `lon`, `locationLabel` | Map |

Back-compat: `physicalIntensity`, `requiredSkills`, `suggestedClothing`, `topics`, `scheduleHint` still accepted and normalized.

---

## Opportunity types

- Volunteer activity  
- Citizen science  
- Community event  
- Trail work  
- Conservation project  
- Animal welfare  
- Food assistance  
- Education  
- Environmental restoration  
- Public land stewardship  
- Emergency preparedness (informational / training — not emergency dispatch)

---

## Citizen science programs

iNaturalist · eBird · GLOBE Observer · NOAA programs · Phenology · Water quality · Invasive reporting · Local wildlife survey  

Each may declare `sharedApps` for future cross-links.

---

## Discovery facets

Encoded in `VolunteerModel.discoveryFacets` and evaluated in `VolunteerFilters.matchesFacet`.

---

## Verification & source

Demo catalog uses `verificationStatus: "demo"` and `source.system: "waypoint-demo"`.  
Future partner ingest should set verification explicitly and never imply guaranteed impact.

---

## Privacy

Personal planning (`VolunteerPlanning`) is **not** part of the shared catalog model. It is browser-local: saves, lists, completed flags, notes.
