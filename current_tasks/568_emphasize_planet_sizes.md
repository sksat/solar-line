# Task 568: Emphasize planet sizes in full-route inertial view

## Status: DONE

## Summary

In full-route view, planets were tiny (0.15-0.4 scene units) relative to camera
distance (~56 scene units), making them nearly invisible. Applied 3× display
radius scale for full-route scenes, increasing visibility while keeping local
scenes (Saturn ring, Uranus approach) unchanged.

### Implementation
- `addPlanet()` in orbital-3d-viewer.js: `displayRadius = isLocal ? planet.radius : planet.radius * 3`
- Label offset also uses `displayRadius` for correct positioning
- Local scenes unaffected (moons, central bodies use original radii)

### Files changed
- `ts/src/orbital-3d-viewer.js` — 3× planet display scale in full-route

## Impact
- Human directive phase 30 item (3) addressed
