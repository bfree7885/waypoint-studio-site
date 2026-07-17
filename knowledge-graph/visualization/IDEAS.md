# Knowledge Graph Visualization Ideas

Visualization should reveal relationships — not become a dashboard for its own sake.

These are ideas for future surfaces. None are required for V1 architecture.

---

## 1. Inline “Connected on Waypoint” strand

**Where:** Species page, observation detail, article footer, topic hub.

**What:** A quiet vertical or horizontal strand of 3–7 related nodes (habitat → weather → research → photo), each one hop from the current entity.

**Why:** Cross-app discovery without navigation redesign.

**Motion:** Soft fade/slide of the next hop as the user expands “Show connections.”

---

## 2. Topic hub constellation

**Where:** Topic pages (deer, morels, oak forest, phenology, infrared).

**What:** Center hub with clustered rings by relationship class (ecological, evidential, editorial, conditions). Not a hairball — capped per ring.

**Why:** Makes a topic feel alive rather than like a documentation stub.

---

## 3. Seasonal timeline

**Where:** Phenology topic; species lifecycle; research chronology.

**What:** Horizontal time axis using `precedes`, `occurs_during`, and seasonal temporal attachments.

**Examples:** Flowering sequence · morel window vs. warm-rain events · deer bedding season vs. thaw spells.

---

## 4. Place fabric map

**Where:** Location / region pages; future Fieldry place view.

**What:** Lightweight map with points/lines/polygons from spatial attachments, plus list of entities linked via `observed_at`, `photographed_at`, `within`.

**Why:** Spatial relationships become visible without forcing every product to build GIS from scratch.

---

## 5. Evidence spine

**Where:** Education articles; contested identification topics.

**What:** A vertical spine of `supported_by`, `contradicted_by`, `updated_research`, `conflicting_evidence` with provenance labels.

**Why:** Separates field fact, research argument, and Waypoint editorial judgment visually.

---

## 6. Cross-app path preview

**Where:** After logging an observation (Fieldry) or viewing a ForageCast species.

**What:** A single narrated path of 4–5 hops (“Your find → habitat → article → lighting note → recent weather”), each hop optional to open.

**Why:** Matches the mission story: one observation becomes part of a larger story.

---

## 7. What not to build first

- Global force-directed graph of the entire studio
- Real-time 3D knowledge galaxies
- Relationship editors for all users
- Nav items for every entity type

Prefer small, contextual visualizations that make one relationship understandable at a glance.

---

## Data already available for demos

| Asset | Use |
|---|---|
| `examples/graph-sample.json` | Deer story constellation + timeline seeds |
| `examples/topics/*.json` | Hub section layouts |
| `registry/relationship-types.json` | Color/class mapping for edges |
