# Waypoint Studio — RC3 Constitution

**Status:** Canonical reference for RC3 and beyond  
**Sprint:** RC3 Sprint 0 — Constitution & Product Realignment  
**Effective:** 2026-07-20

This document is the authority for product decisions, design judgment, AI use, performance expectations, accessibility, and launch quality. When guidance conflicts, prefer this constitution over older mission copy.

---

## 1. Mission

**Observe. Discover. Understand.**

**Tagline**

*Capture what you find. Learn why it matters.*

Waypoint Studio is an outdoor exploration platform. It helps people explore, document, understand, and care for the natural world.

Everything we ship should reinforce observation first, discovery second, and interpretation third — never vanity metrics, never clickbait, never pressure to share.

---

## 2. Philosophy

### Education-first
Explain conditions, habitats, and craft with honesty. Prefer quiet clarity over spectacle.

### Privacy-first
Personal notes and precise locations stay private by default. Sharing is optional. Geolocation is user-initiated.

### Calm trust
The experience should feel steady outdoors: readable typography, intentional whitespace, restrained motion, trustworthy tone.

### Interpretation over raw data
Numbers alone are incomplete. **Waypoint’s Take** turns observations into understanding — educational, thoughtful, never sensational.

### Preserve what works
Do not replace the design language for novelty. Retain and refine brand colors, typography, outdoor identity, and premium visual calm.

---

## 3. Product hierarchy

### Primary products (active priority)

| Product | Access | Role |
|---------|--------|------|
| **Dashboard** | Free | Outdoor mission control — daily conditions, photography context, weather, sun/moon, AQI, rivers, alerts, volunteer hints, articles, Waypoint’s Take |
| **Scenes** | Flagship | Outdoor photography — management, Photo Coach, portfolio, AI culling, collections, Hidden Landscapes, discovery, professional workflow |
| **Sheds** | Flagship | Dedicated shed hunting platform with its own identity, sharing the Waypoint platform |
| **Volunteer** | Free | Meaningful outdoor stewardship — trails, conservation, citizen science, animal care |

### Platform support (not a separate product)

| Layer | Role |
|-------|------|
| **Articles** | Core educational layer supporting every flagship experience — photography, shed hunting, mushrooms, wildlife, conservation, outdoor skills, science, seasonal guides |
| **Waypoint’s Take** | Shared interpretation pattern across Dashboard, Scenes, Sheds, Volunteer, and Articles |

### Incubator (preserve vision; reduce prominence)

Not active development priorities. Do not delete code or documentation. Keep out of primary navigation.

- **SignalTerrain** — radio, spectrum, and defensive cyber awareness (awareness only)
- **Steepleaf**
- **Savant Sommelier**

### Supporting prototypes (available; not primary nav)

Working experiences that remain reachable from the homepage and product docs, but are not RC3 flagship priorities:

- **ForageCast** — foraging environmental guidance (not ID/edibility authority)
- **Fieldry** — nature journaling foundation (landing / waitlist)

---

## 4. Design principles

1. **One job per surface** — each page or section has one purpose and one clear headline.
2. **Brand before decoration** — outdoor identity and calm hierarchy over effects.
3. **Whitespace with intent** — calm reading, not empty dashboards of noise.
4. **Motion serves understanding** — respect `prefers-reduced-motion`.
5. **Honest maturity labels** — Active Prototype, Open Prototype, Planned, Incubator — never imply finished products prematurely.
6. **Refine, don’t reinvent** — evolve `site.css` tokens and patterns instead of introducing a second visual system.

---

## 5. Development standards

- Prefer static, understandable HTML/CSS/vanilla JS unless a product clearly needs more.
- Keep privacy defaults local-first where possible (saves, dismiss flags).
- Document known limitations beside capabilities.
- Preserve commit history where practical; prefer coherent product structure over outdated IA.
- Cross-link Articles and Waypoint’s Take into flagship flows rather than isolating education.
- New features must state which primary product they serve (Dashboard, Scenes, Sheds, Volunteer) or whether they are Incubator-only.
- Prefer Aurora tokens (`styles/aurora-tokens.css`) over one-off hex. Product themes may shift accents; structure stays shared.

---

## 6. AI philosophy

AI may assist with culling, coaching, summarization, and interpretation **only** when it:

- Remains educational and uncertainty-aware
- Never claims legal, medical, edibility, or land-permission authority
- Leaves room for human judgment in the field
- Can later improve models without forcing UI redesign (especially Waypoint’s Take)

Deterministic rules may ship first. Future model-backed Takes should reuse the same presentation contract.

---

## 7. Performance expectations

- Fast first paint on common mobile connections
- Lazy-load maps and heavy media
- Avoid unnecessary re-renders and duplicate network calls
- Cache provider responses thoughtfully; degrade gracefully offline
- Prefer small, reviewable modules over opaque bundles

---

## 8. Accessibility goals

- Keyboard navigation for all primary flows
- Visible focus states
- Meaningful landmarks, labels, and live regions
- Contrast that holds on atmospheric dark surfaces
- Reduced-motion alternatives
- Honest `noscript` guidance when JS is required

---

## 9. Launch quality standards

A surface is not “done” until:

1. Mission and product role are clear within 30 seconds
2. Privacy behavior matches the Privacy page
3. Empty, loading, and failure states are usable
4. Domain disclaimers are present where required (foraging, weather, volunteering, maps)
5. Navigation matches this constitution’s hierarchy
6. Waypoint’s Take (or an explicit placeholder for it) is considered where interpretation adds value
7. Smoke checks pass for linked routes in `sitemap.xml`

---

## 10. Decision test

Before building, ask:

1. Does this help someone **observe**, **discover**, or **understand** the outdoors?
2. Which primary product owns it — or is it Incubator / Articles support?
3. Does it strengthen privacy, calm, and education — or trade them away?
4. Can Waypoint’s Take make the information more useful without becoming clickbait?

If the answer to (1) or (3) is no, do not ship it as a primary experience.

---

## Related documents

- [PRODUCTS.md](./PRODUCTS.md) — product roles and boundaries
- [NAVIGATION-PLAN.md](./NAVIGATION-PLAN.md) — primary vs secondary IA
- [INCUBATOR.md](./INCUBATOR.md) — long-term incubator vision
- [AURORA-DESIGN-SYSTEM.md](./AURORA-DESIGN-SYSTEM.md) — official visual identity
- [AURORA-ACCESSIBILITY.md](./AURORA-ACCESSIBILITY.md) — design-system a11y review
- Public pages: `/dashboard/`, `/incubator/`, `/education/` (Articles), `/design-system/`
