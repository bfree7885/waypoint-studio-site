# Waypoint Knowledge Graph (V1)

Shared connective tissue for Waypoint Studio products.

> Nothing exists in isolation.

This folder is **platform architecture**: schemas, registries, examples, and future API notes. It does not redesign apps or navigation.

## Start here

| Document | Purpose |
|---|---|
| [`../docs/WAYPOINT-KNOWLEDGE-GRAPH.md`](../docs/WAYPOINT-KNOWLEDGE-GRAPH.md) | Philosophy, entities, architecture, AI, scalability |
| [`../docs/WAYPOINT-RELATIONSHIPS.md`](../docs/WAYPOINT-RELATIONSHIPS.md) | Relationship catalog, spatial/temporal/editorial use |

## Layout

```
knowledge-graph/
  schema/           # JSON Schema contracts (entity, relationship, spatial, temporal)
  registry/         # Entity types + relationship types
  examples/         # Sample graph + topic hub configs
  api/              # Future API design
  visualization/    # Visualization ideas
```

## Quick concepts

- **Entity ID:** `wp:{type}:{slug}` — e.g. `wp:species:morel`
- **Relationship:** directed typed edge with optional temporal/spatial scope and provenance
- **Topic:** living hub that aggregates relationships across products
- **Products:** publish and consume shared entities; they do not own exclusive databases of the same real-world things

## Example slice

See [`examples/graph-sample.json`](./examples/graph-sample.json) for the White-tailed Deer story spanning habitat, weather, research, photography, Fieldry, and ForageCast ecology.

## Extending

1. Add entity or relationship types to the registries (do not invent product-local synonyms).
2. Author entities/edges as JSON conforming to `schema/`.
3. Keep provenance. Future AI and editorial trust depend on it.
