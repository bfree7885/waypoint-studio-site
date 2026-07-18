# Master Repair Log — July 2026

| ID | Priority | Problem | Root cause | Repair | Verification |
|----|----------|---------|------------|--------|--------------|
| R1 | P1 | No Privacy page despite privacy-first claims | Missing route | Added `privacy/index.html` | Smoke + manual read |
| R2 | P1 | No Contact/Support | Missing routes | `contact/`, `support/`→contact | Smoke |
| R3 | P1 | Homepage implied broader catalog than exists | Content drift | Available / foundations / direction sections | Smoke honesty asserts |
| R4 | P1 | About dialogs: no focus trap | Custom handlers only | `shared/a11y-dialog.js`; Sheds + Volunteer | Code review + smoke load |
| R5 | P1 | Dialog helper `close` shadowed by DOM node | Naming bug in first draft | Renamed to `closeDialog` | Code review |
| R6 | P1 | WS_0001 referenced missing mp3 files | Assets never committed | Removed `<source>` tags; comment left | Link scan + smoke |
| R7 | P2 | JS apps had no noscript explanation | Omission | Noscript banners | Manual HTML check |
| R8 | P2 | No robots/sitemap/404 | Omission | Added root files | Smoke exists |
| R9 | P2 | Volunteer demo links could look real | Demo data + weak chrome | Stronger map demo tag | Visual/copy check |
| R10 | P2 | No automated regression net | No tooling | `tests/smoke.js` | `node tests/smoke.js` |
| R11 | P2 | About page isolated from privacy | Archive IA | Links to products/privacy/contact | File check |
| R12 | P3 | Skip link missing on homepage | Omission | `.skip-link` in `site.css` + homepage | CSS/HTML |

## Intentionally not repaired (documented)

- Compressing 13MB hero JPEGs (needs image pipeline / owner assets).  
- Building missing apps (Dashboard, SignalTerrain, etc.).  
- Replacing Formspree or self-hosting fonts.  
- Full WCAG certification claim.
