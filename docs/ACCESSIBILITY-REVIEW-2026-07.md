# Accessibility Review — July 2026

## Method

Code review of product HTML/CSS/JS against WCAG-oriented heuristics.  
**Not a full WCAG conformance audit.** No claim of compliance.

## Strengths already present

- Skip links on Sheds and Volunteer field apps.  
- `aria-current`, `aria-pressed`, `aria-live` in places.  
- Focus-visible styles on shared buttons/links.  
- Reduced-motion rules in Scenes and Volunteer CSS.  
- Touch-oriented control sizes in Sheds/Volunteer.

## Findings & repairs

| Priority | Finding | Status |
|----------|---------|--------|
| P1 | About dialogs lacked focus trap | **Fixed** via `shared/a11y-dialog.js` |
| P1 | Homepage lacked skip link | **Fixed** |
| P2 | JS-only apps silent without JS | **Fixed** noscript banners |
| P2 | Archive WS_0001 `cursor:none` / no language attr | Remaining (archive experience) |
| P2 | Map-only content needs text alternatives | Partial — lists accompany maps |
| P3 | Duplicate H1 patterns across marketing pages | Acceptable for MPA |

## Remaining

- Full keyboard pass on ForageCast multi-form page.  
- Screen-reader pass with NVDA/VoiceOver not performed in this block.  
- Contrast sampling not instrumented; dark theme relies on design tokens.
