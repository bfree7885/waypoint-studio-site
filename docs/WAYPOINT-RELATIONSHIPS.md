# Waypoint Relationships

Relationship types are the verbs of the knowledge graph.

Entities answer *what exists*. Relationships answer *how things connect* — in space, in time, in evidence, and in editorial judgment.

Canonical machine-readable registry: [`knowledge-graph/registry/relationship-types.json`](../knowledge-graph/registry/relationship-types.json).

---

## 1. Edge model

Every relationship is a directed edge:

```
from  --[type]-->  to
```

Fields (see [`relationship.schema.json`](../knowledge-graph/schema/relationship.schema.json)):

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Stable relationship ID |
| `type` | yes | Key from the relationship registry |
| `from` | yes | Entity ID |
| `to` | yes | Entity ID |
| `confidence` | no | 0–1; prefer for observed/inferred edges |
| `temporal` | no | When this relationship holds |
| `spatial` | no | Where this relationship holds |
| `provenance` | yes | Who asserted it, when, from what source |
| `properties` | no | Type-specific extras |

### Direction and inverses

Each registry entry may declare an `inverse`. Systems may store one directed edge and materialize the inverse at read time, or store both. V1 examples store the **canonical** direction only.

Example: `observed_at` (observation → location) inverse `has_observation`.

### Open pairing

There is **no** hard matrix of allowed (fromType, toType) pairs in V1. Validation is soft:

- Prefer the `typicalFrom` / `typicalTo` hints in the registry.
- Allow unusual pairs when provenance is strong (e.g. a photo `explains` a terrain feature).
- Reject only unknown `type` keys or malformed IDs.

This keeps the graph open: everything can reference everything else.

---

## 2. Relationship classes

Types are grouped for humans and for future AI allowlists. The `class` field in the registry is one of:

| Class | Meaning |
|---|---|
| `observational` | Grounded in field noticing or media capture |
| `ecological` | Living-world / habitat / species associations |
| `evidential` | Support, contradiction, derivation between claims/works |
| `editorial` | Studio or expert judgment about learning and framing |
| `spatial` | Place and geometry relationships |
| `temporal` | Time-ordering and seasonal linkage |
| `topical` | Topic hierarchy and similarity |
| `systemic` | Cross-domain influence (weather → wildlife, solar → radio) |
| `extensibility` | Reserved hooks for future domains |

---

## 3. Catalog (V1)

### Observational

| Type | Meaning | Typical direction |
|---|---|---|
| `observed_at` | Subject was noticed at a place | observation → location |
| `photographed_at` | Media was captured at a place | photo → location |
| `found_near` | Loose proximity without precise point | entity → location / habitat |
| `observed_together` | Co-occurrence in the field | observation/species → species |
| `referenced_by` | Another entity cites or includes this one | entity → entity (inverse of cites) |

### Ecological

| Type | Meaning | Typical direction |
|---|---|---|
| `associated_habitat` | Species or process linked to habitat | species → habitat |
| `similar_species` | Taxonomic or ecological similarity | species → species |
| `often_confused_with` | Identification lookalike | species → species |
| `seasonal_relationship` | Recurring seasonal association | entity → season / phenology_event |
| `terrain_relationship` | Association with landform/substrate | entity → terrain_feature |
| `weather_relationship` | Association with weather conditions | entity → weather_event / climate_pattern |

### Evidential

| Type | Meaning | Typical direction |
|---|---|---|
| `supported_by` | Claim or guidance backed by source | entity → research/article |
| `contradicted_by` | Conflicting evidence | entity → research/article |
| `related_research` | Relevant study without stronger claim | entity → research_paper |
| `derived_from` | Built from prior work or dataset | entity → entity |
| `explains` | Provides explanatory account of | article/research → entity |
| `expands_upon` | Extends prior work | article/research → article/research |
| `updated_research` | Newer work superseding older | research → research |

### Editorial & learning

| Type | Meaning | Typical direction |
|---|---|---|
| `recommended_reading` | Suggested next read | topic/entity → article/book |
| `background` | Helpful context, not required | entity → article |
| `prerequisite_knowledge` | Should understand first | topic → topic/article |
| `conflicting_evidence` | Editorial flag of dispute | entity → research/article |
| `historical_context` | Past framing that still matters | entity → historical_event/article |
| `foundational_research` | Cornerstone citation | topic/species → research_paper |
| `expert_commentary` | Expert framing | entity → article |
| `waypoint_perspective` | Studio’s interpretive stance | entity → article/topic |

### Topical

| Type | Meaning | Typical direction |
|---|---|---|
| `parent_topic` | Broader topic | topic → topic |
| `child_topic` | Narrower topic (optional if inverse of parent) | topic → topic |

Prefer storing `parent_topic` only; derive children when needed.

### Systemic influence

| Type | Meaning | Typical direction |
|---|---|---|
| `influenced_by` | Causal or strongly conditioning link | entity → weather/climate/event |
| `occurs_during` | Happens within a temporal window | entity → season/event/interval entity |
| `historical_relationship` | Link grounded in history | entity → historical_event |
| `future_extension` | Reserved marker for planned domains | entity → entity |

Use `influenced_by` for cross-domain conditioning (weather → fungi fruiting; solar weather → HF radio). Keep confidence honest.

### Spatial structure

| Type | Meaning | Typical direction |
|---|---|---|
| `within` | Contained by larger place/region | location → region/park |
| `adjacent_to` | Shares boundary or corridor | location → location |
| `drains_to` | Hydrologic flow | river/location → river/watershed |
| `along` | Follows a linear feature | location/observation → trail/river |

Geometry itself lives on the entity’s `spatial` attachment. These edges express **topology and hierarchy**.

### Temporal structure

| Type | Meaning | Typical direction |
|---|---|---|
| `precedes` | Ordered before | event → event |
| `follows` | Ordered after (inverse of precedes) | event → event |
| `overlaps_in_time` | Concurrent windows | entity → entity |

Prefer `precedes` as canonical; materialize `follows` at read time if useful.

---

## 4. Temporal relationships in practice

Relationships over time are modeled in two complementary ways:

1. **Temporal attachment on any edge** — `relationship.temporal` scopes when the edge is valid.
2. **Temporal edge types** — `precedes`, `occurs_during`, `seasonal_relationship` express narrative order.

### Examples

**Species lifecycle**

```
wp:phenology_event:deer-antler-growth
  -[:precedes]-> wp:phenology_event:deer-velvet-shed
  -[:precedes]-> wp:phenology_event:deer-rut
```

**Research chronology**

```
wp:research_paper:bedding-study-1998
  -[:updated_research]-> wp:research_paper:bedding-study-2024
```

**Observation history**

```
wp:observation:oak-ridge-2024-01
  -[:precedes]-> wp:observation:oak-ridge-2025-01
  -[:observed_at]-> wp:location:oak-ridge
```

**Flowering / migration sequences** use `precedes` + seasonal temporal attachments rather than inventing per-species edge types.

---

## 5. Spatial relationships in practice

Optional spatial targets for any object:

- Point · Line · Polygon
- Region · Watershed · County · State · Country
- Habitat · Trail · Park · Management area

Pattern:

1. Attach geometry or `region_ref` on the entity when known.
2. Link into the place graph with `within`, `adjacent_to`, `along`, `drains_to`.
3. Link domain entities with `observed_at`, `photographed_at`, `found_near`, `associated_habitat`.

Future products inherit this automatically: if they mint entities with IDs and optional `spatial`, they join the same place fabric.

---

## 6. Editorial relationships in practice

Editorial edges express **judgment**. Observational edges express **noticing**. Evidential edges express **argument**.

| Intent | Prefer |
|---|---|
| “Read this next” | `recommended_reading` |
| “Helpful but optional” | `background` |
| “Learn X before Y” | `prerequisite_knowledge` |
| “Sources disagree” | `conflicting_evidence` + `contradicted_by` |
| “Newer study replaces older” | `updated_research` |
| “Why this mattered historically” | `historical_context` |
| “Core papers for this topic” | `foundational_research` |
| “Expert framing” | `expert_commentary` |
| “How Waypoint interprets this” | `waypoint_perspective` |

Always set provenance on editorial edges. Downstream AI should treat them as curated guidance, not as field measurements.

---

## 7. Cross-app reuse patterns

### Soft discovery modules

Products should query by entity ID + allowed relationship classes, then render a compact “Connected on Waypoint” module:

- 3–7 related entities
- Mixed classes (e.g. one habitat, one article, one weather, one photo)
- Deep link into the other product only as an optional affordance

Do **not** redesign global navigation to expose the full graph.

### Shared species bridge (already partially real)

ForageCast species slugs (`morel`, `chanterelle`, …) map to `wp:species:{slug}`. Fieldry observations, Education topics, and Sheds terrain notes should reference those IDs rather than inventing parallel species records.

### Topic hubs

Topic entities aggregate edges across products. A single `wp:topic:oak-forest` can connect ForageCast species, Fieldry observations, Education articles, and Scenes photographs.

---

## 8. Worked example — White-tailed Deer story

```
wp:species:white-tailed-deer
  -[:associated_habitat]-> wp:habitat:oak-forest
  -[:found_near]->         wp:location:oak-ridge
  -[:influenced_by]->      wp:weather_event:south-slope-warm-up
  -[:related_research]->   wp:research_paper:winter-bedding-study
  -[:recommended_reading]-> wp:field_guide:eastern-mammals
  -[:photographed_at]->    (via photos) wp:location:oak-ridge
  -[:seasonal_relationship]-> wp:season:winter-bedding

wp:location:oak-ridge
  -[:within]-> wp:region:example-county
  -[:terrain_relationship]-> wp:terrain_feature:south-facing-slope

wp:weather_event:south-slope-warm-up
  -[:occurs_during]-> wp:season:late-winter

wp:topic:wildlife-photography
  -[:recommended_reading]-> wp:article:good-wildlife-lighting
  -[:related_research]-> (optional) lighting / behavior sources
```

One observation or species node becomes part of a larger story: habitat → conditions → research → photography → field history → forage ecology → weather trend.

---

## 9. Worked example — Morel observation discovery

```
wp:observation:morel-2026-04-18
  -[:observed_at]-> wp:location:floodplain-terrace
  -[:observed_together] / about species -> wp:species:morel
wp:species:morel
  -[:associated_habitat]-> wp:habitat:mixed-hardwood-floodplain
  -[:often_confused_with]-> wp:species:false-morel-gyromitra
  -[:weather_relationship]-> wp:weather_event:april-warm-rain
  -[:recommended_reading]-> wp:article:forest-ecology-spring
  -[:seasonal_relationship]-> wp:season:early-spring-morel-window
```

Surfaced in-product (illustrative): related trees → ecology article → photography suggestion → recent weather → historical observations nearby.

---

## 10. Validation rules (lightweight)

1. `type` must exist in the relationship registry.
2. `from` and `to` must be well-formed `wp:{type}:{slug}` IDs.
3. Self-loops allowed only for types that declare `allowsSelf: true` (default false).
4. If `confidence` present, must be 0–1.
5. Editorial class edges should include non-empty `provenance.source`.
6. Unknown entity types are warnings in V1, not hard failures — the entity registry grows.

---

## 11. Extending the registry

To add a relationship type:

1. Add an entry to `relationship-types.json` with `key`, `label`, `class`, `description`, optional `inverse`, `typicalFrom`, `typicalTo`.
2. Document the intent here in one line if it introduces a new class of meaning.
3. Do **not** fork product-specific synonyms (`foragecast_related_habitat` vs `associated_habitat`). Reuse shared keys.

`future_extension` exists as an explicit escape hatch for experimental domains without polluting core types. Promote experiments into named types once they stabilize.

---

## 12. Related documents

- [`WAYPOINT-KNOWLEDGE-GRAPH.md`](./WAYPOINT-KNOWLEDGE-GRAPH.md) — entities, philosophy, architecture, AI, scalability
- [`knowledge-graph/registry/relationship-types.json`](../knowledge-graph/registry/relationship-types.json)
- [`knowledge-graph/examples/graph-sample.json`](../knowledge-graph/examples/graph-sample.json)

---

*Waypoint Relationships V1 — platform architecture work block.*
