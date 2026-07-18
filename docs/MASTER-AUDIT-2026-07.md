# Master Audit — July 2026

## Scope reality check

The audit brief names many applications (Dashboard, SignalTerrain, Photo Coach, Steepleaf, etc.).  
**Those applications are not present in this repository.** They are documented as long-term direction only.

Audit and repair focused on the **actual** public surface: homepage, About/Privacy/Contact, Waypoint Scenes, ForageCast, Sheds, Volunteer, Education/Fieldry landings, knowledge-graph docs, archive pages.

## Condition before

- Strong prototypes (Scenes, ForageCast, Sheds, Volunteer) on a calm design system.
- No Privacy/Contact/Support routes; no robots/sitemap/404.
- Homepage mixed “upcoming” language with live prototypes; did not disclose missing future apps.
- Volunteer Discovery Engine v0.1 present locally (uncommitted) with demo `example.org` links.
- Missing ambient mp3s under archive WS_0001 experience.
- About dialogs lacked focus trapping.
- No automated smoke tests; no package/lint/typecheck toolchain.
- Deployed site not verifiable from this environment (HTTP 403).

## Condition after

- Trust routes: Privacy, Contact, Support→Contact, 404, robots, sitemap.
- Homepage splits **Available now / Early foundations / Long-term direction**.
- Shared `a11y-dialog.js` with focus trap; wired into Sheds + Volunteer.
- Noscript banners on Sheds, Volunteer, ForageCast.
- Broken WS_0001 mp3 references removed (silent ambient channels).
- Stronger Volunteer demo labeling.
- `tests/smoke.mjs` covers routes, honesty markers, Volunteer engine, link warnings.
- Full review doc set under `docs/MASTER-*` and domain/privacy/a11y/perf reviews.

## Largest improvements

1. Public honesty about what is / is not available.  
2. Privacy expectations match behavior.  
3. Accessibility of About dialogs.  
4. Crawl/error basics for static hosting.  
5. Regression smoke coverage for Volunteer + critical routes.

## Remaining risks

- Unoptimized multi‑MB hero images (performance / mobile data).  
- Formspree + Google Fonts third-party network dependency.  
- Volunteer catalog is demo-only — risk of user confusion if labeling overlooked.  
- No real CI, HTML validators, or cross-browser automation in-repo.  
- Cannot confirm GitHub Pages deployment or cache state from this environment.
