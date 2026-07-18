# Waypoint Volunteer — UX

## Mission test

Can a first-time visitor understand the purpose in under 30 seconds?

The primary headline is the mission question:

> **What good can I do today?**

Supporting copy emphasizes calm discovery — no points, streaks, or pressure.

---

## Principles in the interface

| Do | Don’t |
|----|--------|
| Invite curiosity | Guilt or obligation |
| Explain recommendations | Hide scoring as “points” |
| Honest impact language | Exaggerate outcomes |
| Private saves by default | Public profiles / followers |
| Account-free browsing | Gate discovery behind signup |
| Inclusive filters (access, family, remote) | Rank people |

---

## Surfaces

### Discovery (`/volunteer/`)

- Today strip — weather-aware insights  
- Panel — **Today I can…** prompts, discovery facets, filters, results  
- Map — category colors, locate, list/map toggle  
- Cards — save / interested / list / hide + link to full page  

### Opportunity page (`/volunteer/opportunity/?id=`)

What you’ll do · Why it matters · Who benefits · Time · Difficulty · Accessibility · Equipment · Weather · Registration · Org links · Private notes / completed

### Organization page (`/volunteer/organization/?id=`)

Mission · Location · Causes · Accessibility · Recurring / seasonal · Opportunities · Contact  

**No ratings. No popularity metrics.**

### Saved (`/volunteer/saved/`)

Personal lists · Saved for later · Completed (private) · Bookmarked orgs · Notes  

Sharing is optional and **not** implemented in v0.1 (privacy-first).

---

## Accessibility

- Skip links, keyboard focus, `aria-pressed` / live regions  
- Touch-friendly controls  
- Meaningful empty states  
- Color is supported by text labels (not color-alone meaning)

---

## Responsive behavior

- Desktop: map + side panel  
- Mobile: map with bottom sheet; list view expands the sheet  
- Detail/saved pages use standard studio scrolling layout (`vol-page`)

---

## Visual language

Uses Waypoint Studio tokens (`site.css`): Cormorant Garamond + Source Sans 3, lime accent, atmospheric dark surfaces — consistent with Sheds / ForageCast field tools.
