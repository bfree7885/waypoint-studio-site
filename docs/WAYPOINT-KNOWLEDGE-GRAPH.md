# Waypoint Knowledge Graph

**Nothing exists in isolation.**

This document defines the shared knowledge graph that connects every object, observation, article, photograph, species, location, event, and research paper across Waypoint Studio.

It is platform architecture — not a product redesign. Navigation, apps, and AI features stay as they are. The graph is the connective tissue underneath them.

---

## 1. Philosophy

Nature is connected. Science is connected. Photography is connected.

Weather influences wildlife. Wildlife influences photography. Climate influences fungi. Solar weather influences radio. Research influences recommendations.

Waypoint should reflect those relationships.

### What we are building toward

| Isolated databases | Connected knowledge ecosystem |
|---|---|
| Each product owns its own objects | Shared entities, product-specific *views* |
| Links are hardcoded or absent | Typed relationships anyone can traverse |
| Discovery requires knowing where to click | Relationships surface related knowledge in place |
| An observation is a row | An observation is a node in a living story |
| Growth adds silos | Growth compounds value across products |

### Design principles

1. **Everything can relate to everything else.** No closed type matrix. Relationship types are registered and validated; entity pairs are not restricted by product.
2. **Entities are shared; experiences are product-owned.** ForageCast, Fieldry, Sheds, Education, and Scenes all reference the same species, places, and topics.
3. **Time and place are first-class optional attachments.** Not every node has a geometry or a date — but every node *may*.
4. **Editorial judgment is a relationship, not a tag.** “Recommended reading” and “conflicting evidence” are edges with provenance.
5. **Evolve for years, ship for today.** V1 is file-backed JSON with stable IDs. Storage can move to Postgres, a graph store, or both without changing the conceptual model.
6. **No overengineering.** Prefer a small core schema + an extensible registry over a heavy ontology framework.

---

## 2. Core model

```
Entity  ──relationship──▶  Entity
   │                           │
   ├── optional Spatial        ├── optional Spatial
   └── optional Temporal       └── optional Temporal
```

- **Entity** — a durable thing in the world or in Waypoint’s knowledge base.
- **Relationship** — a typed, directed edge between two entities (with optional reverse semantics).
- **Spatial** — optional geometry / place hierarchy attachment.
- **Temporal** — optional instant, interval, or recurring season attachment.

Products never “own” entities exclusively. A product may *publish* an entity and may *prefer* certain relationship types in its UI.

---

## 3. Identity

Every entity has a stable Waypoint ID:

```
wp:{entityType}:{slug}
```

Examples:

| ID | Meaning |
|---|---|
| `wp:species:white-tailed-deer` | Odocoileus virginianus |
| `wp:species:morel` | Morchella spp. (aligned with ForageCast slug) |
| `wp:location:oak-ridge` | Named place / habitat patch |
| `wp:topic:infrared-photography` | Living topic hub |
| `wp:article:winter-bedding-study` | Research or editorial piece |
| `wp:observation:fieldry-2026-04-12-001` | A concrete field observation |
| `wp:photo:ws0001-scene-a` | Photograph / scene asset |

Rules:

- IDs are opaque to end users; slugs are human-readable for editors.
- Renaming a display label does **not** change the ID.
- External IDs (iNaturalist, GBIF, DOI, OSM, NOAA station IDs) live in `externalIds[]`, never as the primary key.
- When ForageCast already uses a slug (e.g. `morel`), reuse it in `wp:species:morel`.

---

## 4. Core entity types

Entity types are registered in [`knowledge-graph/registry/entity-types.json`](../knowledge-graph/registry/entity-types.json). The table below is the V1 vocabulary — expandable, not exhaustive.

### Living world

| Type | Description | Example |
|---|---|---|
| `species` | Organism taxon or species complex | White-tailed deer, morel |
| `habitat` | Ecological setting | Oak forest, wetland |
| `observation` | A recorded noticing of something | Fieldry journal entry |
| `phenology_event` | Seasonal life-cycle occurrence | First flowering, leaf-out |
| `terrain_feature` | Landform or substrate | South-facing slope, ridgeline |

### Place & space

| Type | Description | Example |
|---|---|---|
| `location` | Named place (any scale) | Oak Ridge, specific trailhead |
| `trail` | Path or route | Ridge loop |
| `river` | Hydrologic feature | Named creek / watershed segment |
| `region` | Administrative or ecological region | County, ecoregion, management area |
| `park` | Protected or managed outdoor area | State park, wildlife management area |

### Media & knowledge

| Type | Description | Example |
|---|---|---|
| `photo` | Photograph or scene still | Waypoint Scenes frame |
| `article` | Editorial or educational article | Education piece |
| `research_paper` | Formal study or paper | Winter bedding study |
| `book` | Book-length work | Field guide volume |
| `field_guide` | Identification / place guide | Regional mushroom guide |
| `government_publication` | Agency report or bulletin | USGS / NOAA / DNR pub |
| `author` | Person who creates knowledge | Naturalist, photographer, scientist |
| `organization` | Institution | University lab, land trust |
| `topic` | Living hub for a subject | Phenology, HF radio, wetlands |
| `collection` | Curated set (user or editorial) | User collection, studio series |

### Conditions & events

| Type | Description | Example |
|---|---|---|
| `weather_event` | Discrete weather occurrence | Multi-day warm-up, frost |
| `climate_pattern` | Longer climate / oscillation pattern | Drought year, El Niño season |
| `season` | Named seasonal window | Early spring morel window |
| `historical_event` | Past event with lasting relevance | Local land-use change |
| `satellite` | Orbital platform or dataset family | Weather / earth-obs satellite |
| `radio_signal` | Signal class or observation | HF band conditions |
| `cyber_incident` | Security event (future products) | Infrastructure-related incident |
| `infrastructure` | Built system | Tower, trail bridge, weather station |

Products may introduce additional types via the registry. Prefer reusing an existing type with richer properties over inventing a near-duplicate.

---

## 5. Shared schema (conceptual)

Full JSON Schema files live under [`knowledge-graph/schema/`](../knowledge-graph/schema/).

### Entity (minimal)

```json
{
  "id": "wp:species:white-tailed-deer",
  "type": "species",
  "label": "White-tailed Deer",
  "summary": "Common eastern woodland ungulate; strong seasonal habitat shifts.",
  "aliases": ["Odocoileus virginianus", "whitetail"],
  "status": "active",
  "spatial": null,
  "temporal": null,
  "externalIds": [{ "system": "itis", "value": "180699" }],
  "provenance": {
    "source": "waypoint-editorial",
    "createdAt": "2026-07-16",
    "updatedAt": "2026-07-16"
  },
  "properties": {
    "scientificName": "Odocoileus virginianus",
    "category": "Mammal"
  },
  "apps": ["sheds", "fieldry", "education"]
}
```

### Relationship (minimal)

```json
{
  "id": "rel:001",
  "type": "associated_habitat",
  "from": "wp:species:white-tailed-deer",
  "to": "wp:habitat:oak-forest",
  "confidence": 0.9,
  "temporal": { "kind": "seasonal", "seasons": ["winter"] },
  "spatial": null,
  "provenance": {
    "source": "waypoint-editorial",
    "createdAt": "2026-07-16"
  },
  "properties": {}
}
```

`confidence` is optional (0–1). Editorial edges often omit it; observational or inferred edges should include it when known.

---

## 6. Topic pages as living hubs

A **topic** is not documentation alone. It is a hub node that aggregates relationships.

Examples: White-tailed Deer · Morel Mushrooms · Infrared Photography · Oak Forest · HF Radio · Solar Storms · Wetlands · Phenology

A topic page (conceptually) renders:

1. **Identity** — label, summary, aliases
2. **Core network** — primary related entities (habitat, species, methods)
3. **Current conditions** — weather / phenology / seasonal edges that are temporally active
4. **Evidence** — research, articles, field guides
5. **Media** — photos and scenes
6. **Field history** — observations over time
7. **Cross-app surfaces** — soft pointers into ForageCast, Fieldry, Sheds, Scenes, Education *without* forcing navigation redesign

Implementation can start as static JSON → HTML templates; later as an API-driven page. The graph model stays the same.

---

## 7. Cross-app discovery

Products remain distinct. Discovery happens by **reading relationships from the shared graph**, not by merging UIs.

### Example path (mushroom observation)

```
Observation (morel)
  → associated_habitat → Oak / elm hardwoods
  → related_research → Forest ecology article
  → photography suggestion → Lighting / composition topic
  → visualized_in → Hidden Landscapes / Scenes study
  → influenced_by → Recent weather event
  → referenced_by → Historical Fieldry observations nearby
```

Each hop is a typed edge. A product UI chooses which 1–3 hops to surface inline (“Related on Waypoint”) without becoming a dashboard.

### Product roles (non-exclusive)

| Product | Typically publishes | Typically consumes |
|---|---|---|
| **ForageCast** | Species profiles, season windows, habitat affinities, county/region suitability | Weather events, terrain, phenology, education topics |
| **Fieldry** | Observations, collections, personal place notes | Species, habitats, seasons, research, photos |
| **Sheds** | Terrain interpretations, shed-related observations | Deer/species, habitat, weather, historical land use |
| **Waypoint Scenes** | Photos, scene studies, lighting contexts | Species, habitat, weather, photography topics |
| **Education** | Articles, topics, authors, reading paths | Species, habitats, research, phenology |
| **Future products** | Domain-specific entities | The entire shared graph |

---

## 8. Spatial integration

Every entity may attach a spatial descriptor (see [`spatial.schema.json`](../knowledge-graph/schema/spatial.schema.json)):

| Kind | Use |
|---|---|
| `point` | Observation, photo geotag, trailhead |
| `line` | Trail, river segment |
| `polygon` | Habitat patch, park boundary |
| `region_ref` | County, state, country, watershed, management area (by ID) |

Place hierarchy is modeled as **entities + relationships** (`location` → `within` → `region`), not as nested JSON only. That lets a watershed relate to species, articles, and weather the same way a point does.

Future products inherit spatial support automatically by referencing entities that already carry geometry or region links.

---

## 9. Temporal integration

Every entity and every relationship may carry temporal context (see [`temporal.schema.json`](../knowledge-graph/schema/temporal.schema.json)):

| Kind | Use |
|---|---|
| `instant` | A single observation timestamp |
| `interval` | Study period, migration window, incident duration |
| `seasonal` | Recurring phenology (“early spring”) |
| `relative` | “Before leaf-out”, “after rain” (qualitative) |

This enables:

- Species lifecycle narratives
- Research chronology
- Observation history
- Migration and flowering sequences
- Technology / conflict timelines (future)

Relationships themselves can be time-scoped: *deer associated with oak forest **in winter*** is an edge with seasonal temporal data — not a separate entity type.

---

## 10. Editorial integration

Editorial relationships (`recommended_reading`, `prerequisite_knowledge`, `conflicting_evidence`, `waypoint_perspective`, etc.) are edges with provenance. They express studio judgment without polluting scientific observation edges.

Guidelines:

- Prefer `supported_by` / `contradicted_by` for evidence claims.
- Prefer `recommended_reading` / `background` / `prerequisite_knowledge` for learning paths.
- Always record `provenance.source` for editorial edges so AI and UI can distinguish judgment from field fact.

Full catalog: [`WAYPOINT-RELATIONSHIPS.md`](./WAYPOINT-RELATIONSHIPS.md).

---

## 11. Future AI reasoning

AI features are **out of scope for this work block**, but the graph is designed so future AI traverses relationships instead of answering from isolated product silos.

Example: user asks about a deer.

A reasoner can walk:

```
species:white-tailed-deer
  → associated_habitat → habitats + locations
  → influenced_by → active weather / climate
  → related_research → papers & articles
  → observed_at / photographed_at → nearby observations & photos
  → seasonal_relationship → phenology
  → similar_species / often_confused_with → related taxa
  → recommended_reading → field guides
```

No hardcoding of “deer package.” The answer composition follows edges + confidence + temporal/spatial filters.

Constraints for future implementers:

- Prefer registered relationship types over free-text links.
- Surface provenance (“based on Fieldry observations + NOAA weather”).
- Respect confidence and editorial vs. observational edge classes.

---

## 12. Architecture (V1 → durable)

### V1 (now): file-backed graph

```
knowledge-graph/
  schema/           # JSON Schema contracts
  registry/         # Entity & relationship type registries
  examples/         # Seed / example datasets
  api/              # Future API design notes
  visualization/    # Visualization ideas
```

Apps and static pages may import example JSON today. Authoring can remain editorial (hand-edited JSON or future CMS).

### V2 (when needed): API + store

- Persist entities and relationships in a relational store (entities + edges tables) *or* a graph database.
- Expose read APIs described in [`knowledge-graph/api/FUTURE-API.md`](../knowledge-graph/api/FUTURE-API.md).
- Keep the same IDs and relationship type registry so file seeds migrate cleanly.

### What we deliberately skip in V1

- Full ontology / OWL tooling
- Real-time sync between products
- Automatic link inference at scale
- User-facing graph editor UI
- Redesigning app navigation around the graph

---

## 13. Scalability

| Concern | Approach |
|---|---|
| Entity growth | Stable IDs + append-only style creation; soft `status: archived` |
| Relationship growth | Typed registry; index `(from, type)` and `(to, type)` |
| Many products | `apps[]` is a hint for surfacing, not a permission boundary |
| Conflicting claims | Parallel edges with provenance; use `contradicted_by` / `updated_research` |
| Spatial volume | Store references to GeoJSON / external tiles; keep graph edges light |
| Temporal volume | Query by interval indexes later; V1 keeps ISO-8601 strings |
| AI traversal | Depth limits + type allowlists per prompt context |

Knowledge compounds: the more observations, photos, and papers enter the graph, the denser and more useful every existing node becomes.

---

## 14. Success criteria

Waypoint no longer feels like several independent apps.

It feels like **one connected understanding of the world**.

- Every product strengthens every other product.
- Users naturally discover relationships.
- Knowledge compounds over time.
- The more Waypoint grows, the more valuable every individual observation becomes.

---

## 15. Related files

| File | Role |
|---|---|
| [`WAYPOINT-RELATIONSHIPS.md`](./WAYPOINT-RELATIONSHIPS.md) | Relationship types, spatial/temporal/editorial detail |
| [`knowledge-graph/registry/entity-types.json`](../knowledge-graph/registry/entity-types.json) | Entity type registry |
| [`knowledge-graph/registry/relationship-types.json`](../knowledge-graph/registry/relationship-types.json) | Relationship type registry |
| [`knowledge-graph/schema/`](../knowledge-graph/schema/) | JSON Schemas |
| [`knowledge-graph/examples/`](../knowledge-graph/examples/) | Example datasets |
| [`knowledge-graph/api/FUTURE-API.md`](../knowledge-graph/api/FUTURE-API.md) | Future API sketch |
| [`knowledge-graph/visualization/IDEAS.md`](../knowledge-graph/visualization/IDEAS.md) | Visualization ideas |

---

*Waypoint Knowledge Graph V1 — platform architecture work block.*
