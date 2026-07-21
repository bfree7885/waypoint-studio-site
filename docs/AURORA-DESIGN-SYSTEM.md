# Aurora Design System

**Status:** Official Waypoint Studio visual identity  
**Sprint:** RC3 Sprint 2  
**Showcase:** `/design-system/`

---

## Philosophy

Users should feel like they are opening **a National Park visitor center designed by photographers**.

| We are | We are not |
|--------|------------|
| Premium, quiet, natural | Corporate SaaS |
| Modern, elegant | Cyberpunk / gaming UI |
| Atmospheric, photographic | Generic Bootstrap / Material clone |
| Interpretive | Flashy |

Inspiration: Northern Lights, New England autumn, quaking aspen, evergreen forests, golden hour, blue hour, night photography.

---

## Files

| File | Role |
|------|------|
| `styles/aurora-tokens.css` | Palette, type, space, motion, product themes, light/dark |
| `styles/aurora.css` | Components (buttons, cards, nav accents, icons, loading, empty, forms, Take) |
| `styles/site.css` | Layout + marketing patterns; imports Aurora |
| `design-system/index.html` | Living component library |

Product CSS (`sheds.css`, `volunteer.css`, `foragecast.css`) continues to layer on `site.css` and inherits tokens.

---

## Core tokens

### Core
- **Charcoal** `#0c1018` — `--aurora-charcoal`
- **Slate** `#1a2332` — `--aurora-slate`
- **Off White** `#eef2f6` — `--aurora-off-white`

### Scenes
- Aurora Violet, Midnight Blue, Aurora Lime, Magenta

### Dashboard
- Morning Blue, Golden Hour, Twilight Purple, Night Sky

### Sheds
- Aspen Gold, Evergreen, Burnt Orange, Bark Brown

### Volunteer
- Evergreen, Forest Green, Moss

Semantic aliases (`--bg`, `--surface`, `--text`, `--accent`, …) remain stable for existing markup.

---

## Product themes

Apply on `body` or a section:

```html
<body class="theme-dashboard">
<!-- or -->
<section data-product="sheds">
```

| Class / attribute | Accent character |
|-------------------|------------------|
| `theme-scenes` | Aurora lime + violet |
| `theme-dashboard` | Morning blue + golden hour tint |
| `theme-sheds` | Aspen gold + evergreen |
| `theme-volunteer` | Moss + forest |

---

## Typography

- **Display:** Cormorant Garamond — headlines, Takes, taglines  
- **Body:** Source Sans 3 — UI and reading  
- Spacing scale: `--space-1` … `--space-7`  
- Radii kept modest (`--radius-sm/md/lg`) — calm, not bubbly

---

## Components

- Buttons: `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.aurora-btn*`
- Cards: `.card`, `.aurora-card*`
- Badges: `.badge`, `.badge-free`, `.badge-flagship`, `.badge-planned`, `.badge-beta`
- Icons: `.aurora-icon`, `.aurora-icon-tile` (inline SVG, stroke)
- Loading: `.aurora-skeleton*`, `.aurora-spinner`, `.aurora-loading`
- Empty: `.aurora-empty*`
- Forms: `.aurora-field`, `.aurora-input`, `.aurora-label`
- Interpretation: `.take-panel` / `.aurora-take`

Motion uses `--duration-*` and respects `prefers-reduced-motion`.

---

## Dark & light

- **Dark is default** (night sky / charcoal field).  
- Light mode: `data-theme="light"` on `<html>` — off-white field, charcoal type.  
- Showcase toggles both modes for QA.

---

## Usage rules

1. Prefer tokens over hard-coded hex in new UI.  
2. Product accent shifts must not change layout structure.  
3. Waypoint’s Take stays educational and calm — italic display type, left accent bar.  
4. Do not introduce neon glow, multi-layer glass stacks, or pill-heavy chrome.  
5. Refine; do not replace Cormorant + Source Sans without Constitution review.

---

## Related

- [AURORA-ACCESSIBILITY.md](./AURORA-ACCESSIBILITY.md)  
- [RC3-CONSTITUTION.md](./RC3-CONSTITUTION.md)  
- [PRODUCTS.md](./PRODUCTS.md)
