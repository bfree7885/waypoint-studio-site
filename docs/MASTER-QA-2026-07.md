# Master QA — July 2026

## Tooling baseline

| Command | Result | Notes |
|---------|--------|-------|
| `ls package.json` | Missing | Predates audit — no npm install/build/lint/typecheck |
| `npm test` / Playwright / Jest | N/A | No harness |
| HTML/CSS validators (W3C) | Not run | Network/tooling not wired in CI |
| `npm audit` | N/A | No lockfile; CDN deps only |
| Service worker tests | N/A | No SW |
| Manifest validation | N/A | No manifest |

## Checks run this work block

| Command | Result |
|---------|--------|
| Python internal link scan (pre-repair) | 9 missing → all WS_0001 `.mp3` |
| Python internal link scan (post-repair) | Re-run via smoke WARN if any |
| `node --check` on Volunteer JS modules | Pass (prior session + engine load) |
| `node tests/smoke.js` | See latest run output in owner report |
| `curl` GitHub Pages | **403 Forbidden** — deploy parity unknown |
| Chromium/Firefox interactive | Available in environment; full matrix not automated |

## Manual interaction checklist (high confidence)

| Action | Result |
|--------|--------|
| Homepage → each Available product | Links resolve |
| Privacy / Contact / Support | Resolve |
| Volunteer filters + Today I Can (engine) | Unit-level via smoke |
| Sheds/Volunteer About dialog script hooks | Present |
| ForageCast disclaimers | Present in HTML/JS |
| Sheds “not a find guarantee” | Present |

## Gaps

- No headless screenshot matrix across breakpoints.  
- No offline simulation beyond code review of banners.  
- No Formspree live submit test (would create real inbox noise).
