# Aurora Design System — Accessibility Review

**Sprint:** RC3 Sprint 2  
**Scope:** Tokens, components, dark/light themes, showcase page

---

## Goals (from RC3 Constitution)

- Keyboard navigation for primary flows  
- Visible focus states  
- Meaningful landmarks and labels  
- Contrast on atmospheric dark surfaces  
- Reduced-motion alternatives  
- Honest empty / loading / failure states  

---

## Findings & mitigations

| Area | Status | Notes |
|------|--------|------|
| Focus ring | Pass | `--focus-ring` dual-ring on interactive Aurora controls; `:focus-visible` preferred |
| Skip link | Pass | Existing `.skip-link` retained; contrast against surface |
| Dark text on Night Sky | Pass (target) | Off-white `#eef2f6` on `#070b14`; muted `#8b9bb8` for secondary only |
| Accent-only meaning | Watch | Lime/gold accents are decorative + current-page cue; copy still required |
| Magenta / burnt orange | Watch | Use for secondary emphasis, not sole status indicators |
| Light theme | Pass | Charcoal on off-white; evergreen focus ring for stronger contrast |
| Touch targets | Pass | Buttons / nav links ≥ ~44px height on mobile via `min-height` |
| Reduced motion | Pass | Token durations collapse; skeleton/spinner/card lift disabled |
| Loading | Pass | `.aurora-loading` + spinner; pair with `aria-live` in product UIs |
| Empty | Pass | Title + body + next action pattern |
| Icons | Pass | Stroke icons decorative with `aria-hidden` when adjacent text exists |
| `color-mix` | Watch | Progressive enhancement for borders; solid token fallbacks remain on base colors |

---

## Product theme caution

Sheds **Aspen Gold** and Dashboard **Morning Blue** on dark surfaces meet large-text / UI-accent use. Do **not** set long body copy in gold or blue without checking contrast — keep body on `--text` / `--muted`.

---

## Recommended QA checklist (manual)

1. Tab through `/design-system/` — every control shows a visible focus ring.  
2. Toggle light theme — body text and borders remain readable.  
3. Enable OS reduced motion — no shimmer/spin/lift.  
4. Zoom to 200% — nav wraps; cards stack; no clipped focus rings.  
5. Screen reader: empty state announces title + action link.  

---

## Follow-ups for later sprints

- Audit Sheds / Volunteer map chrome against Aspen Gold / Moss accents  
- Add forced-colors / Windows High Contrast smoke  
- Formal WCAG 2.2 AA contrast lab report on all four product themes  

---

## Verdict

Aurora is **ready as the official identity foundation** with dark-default calm contrast, focus treatment, and reduced-motion support. Remaining work is product-surface audits as Dashboard widgets and richer Scenes chrome land — not a blocker for adopting tokens site-wide.
