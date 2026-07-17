# Future API Design

Read-oriented API sketch for when the file-backed graph moves behind a service.

V1 does **not** require implementing this. Keep IDs, registries, and schemas stable so seeds migrate cleanly.

---

## Design goals

- Stable `wp:{type}:{slug}` identifiers
- Relationship-type registry as the vocabulary source of truth
- Cheap neighborhood queries for in-product discovery modules
- Optional spatial and temporal filters
- Provenance always available to clients and future AI

Non-goals for the first API:

- Full graph analytics suite
- Real-time multiplayer editing
- Automatic inference engine

---

## Resources

### `GET /v1/entities/{id}`

Return one entity.

```http
GET /v1/entities/wp:species:morel
```

```json
{
  "entity": { "...": "Entity object" },
  "counts": {
    "outgoing": 12,
    "incoming": 4
  }
}
```

### `GET /v1/entities`

Filter entities.

| Param | Meaning |
|---|---|
| `type` | Entity type key |
| `app` | Surfacing hint (`foragecast`, `fieldry`, …) |
| `q` | Label / alias search |
| `status` | `active` \| `draft` \| `archived` |
| `near` | `lon,lat` |
| `radiusKm` | Used with `near` |
| `regionId` | Place entity ID |
| `limit` / `cursor` | Pagination |

### `GET /v1/entities/{id}/neighborhood`

Primary discovery endpoint for products.

| Param | Meaning |
|---|---|
| `direction` | `out` \| `in` \| `both` (default `both`) |
| `types` | Comma-separated relationship type keys |
| `classes` | Comma-separated relationship classes |
| `depth` | `1` (default) or `2` max for V1 |
| `limit` | Cap related entities (default 20) |
| `asOf` | ISO date — keep edges valid at this time |
| `season` | Seasonal filter token |

```json
{
  "center": "wp:species:white-tailed-deer",
  "nodes": [ { "id": "...", "entity": {} } ],
  "edges": [ { "id": "...", "relationship": {} } ]
}
```

### `GET /v1/topics/{id}`

Topic hub assembly: entity + sectioned neighborhood using the topic’s declared section relationship types (see example topic JSON).

### `GET /v1/relationships`

| Param | Meaning |
|---|---|
| `from` / `to` | Entity ID |
| `type` | Relationship type |
| `class` | Relationship class |

### `GET /v1/registry/entity-types`

### `GET /v1/registry/relationship-types`

Serve the JSON registries (possibly cached). Clients and AI tools should not hardcode vocabularies.

---

## Write API (later)

Start editorial-only:

- `POST /v1/entities`
- `PATCH /v1/entities/{id}`
- `POST /v1/relationships`
- `PATCH /v1/relationships/{id}`
- Soft-delete via `status: archived`

AuthZ: studio editors first; user-generated Fieldry observations second (scoped provenance).

---

## Traversal for future AI

Suggested internal helper (not necessarily public):

```http
POST /v1/traverse
```

```json
{
  "start": "wp:species:white-tailed-deer",
  "allowClasses": ["ecological", "systemic", "evidential", "editorial", "observational"],
  "maxDepth": 3,
  "maxNodes": 40,
  "asOf": "2026-02-20",
  "preferApps": ["fieldry", "education", "sheds"]
}
```

Returns a bounded subgraph with provenance intact. Product chat UIs compose answers from this subgraph rather than from hardcoded “deer packs.”

---

## Storage mapping (suggested)

| Graph concept | Relational sketch |
|---|---|
| Entity | `entities(id, type, label, summary, status, spatial jsonb, temporal jsonb, properties jsonb, …)` |
| Relationship | `relationships(id, type, from_id, to_id, confidence, temporal jsonb, spatial jsonb, properties jsonb, …)` |
| Indexes | `(type)`, `(from_id, type)`, `(to_id, type)`, spatial GIST when needed |

A graph database is optional. The conceptual model does not depend on it.

---

## Compatibility with today’s files

| File | API analogue |
|---|---|
| `examples/graph-sample.json` | Seed fixture for `/entities` + `/relationships` |
| `registry/*.json` | `/v1/registry/*` |
| `examples/topics/*.json` | Topic hub configs for `/v1/topics/{id}` |
| `schema/*.schema.json` | Request/response validation |

---

## Versioning

- URL prefix `/v1`
- Additive fields are non-breaking
- Relationship type keys are forever; deprecate with `status` on registry entries rather than renaming
