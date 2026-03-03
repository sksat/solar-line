# Task 564: Add inline 3D viewers to EP01 and EP04 — all episodes covered

## Status: DONE

## Summary

Added inline 3D viewers to the remaining episodes (EP01 and EP04), completing
coverage across all 5 episodes.

- **EP01**: full-route scene (overview of the entire journey from departure)
- **EP04**: uranus-approach + full-route scene switcher (departure from Titania + journey context)

### Files changed
- `reports/data/episodes/ep01.md` — 3d-viewer directive (full-route)
- `reports/data/episodes/ep04.md` — 3d-viewer directive (uranus-approach + full-route)
- `ts/e2e/reports.spec.ts` — 2 new/updated E2E tests (283→284 E2E)

## Impact
- All 5 episodes now have inline 3D viewers
- EP01: full-route, EP02: saturn-ring, EP03: saturn-ring, EP04: uranus-approach+full-route, EP05: uranus-approach
