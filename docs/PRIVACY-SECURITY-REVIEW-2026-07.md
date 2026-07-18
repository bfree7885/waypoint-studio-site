# Privacy & Security Review — July 2026

Defensive review only. No offensive testing.

## Privacy promises vs behavior

| Promise | Behavior | Verdict |
|---------|----------|---------|
| Private saves (Volunteer) | `localStorage` only | Matches — documented on Privacy page |
| No social graph | No profiles/followers | Matches |
| Location optional | Geolocation on user gesture; demo fallback | Matches |
| No invasive analytics | None found in repo | Matches |

## Security findings

| Priority | Finding | Action |
|----------|---------|--------|
| P2 | Formspree endpoint public in repo | Expected for Formspree; documented; not a secret key |
| P2 | `innerHTML` used for cards/insights | Content from static catalog + escaped helpers in Volunteer cards/detail | Keep discipline; no user HTML |
| P2 | External scripts (Leaflet, fonts) | Leaflet uses SRI; fonts without SRI | Accept / document |
| P3 | `target=_blank` | Volunteer uses `rel="noopener noreferrer"` | OK |
| — | Secrets / API keys | None found beyond public Formspree form id | OK |
| — | Open redirects | Not observed | OK |

## Data leaving the browser

- Open-Meteo queries include lat/lon when user/demo location set.  
- Map tile requests reveal approximate viewport.  
- Formspree receives emails users submit.

## Cannot fix in-repo alone

- GitHub Pages security headers.  
- Confirming production caching / HTTPS config.  
- User device compromise of `localStorage`.
