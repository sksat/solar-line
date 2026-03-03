# Task 566: Fix orbital plane exaggeration in 3D viewer

## Status: DONE

## Summary

Orbital planes appeared massively off because z-heights were exaggerated by ×10.
Saturn at the mission epoch has zHeightAU=0.319 AU which with ×10 produced 18.5°
visual elevation (vs real ~2.5° inclination). Reduced to ×3 → Saturn shows 5.7°.

### Root cause
- `zFromAU(zAU) = zAU * AU_TO_SCENE * 10` — too aggressive
- Saturn z=0.319 AU × 5 × 10 = 15.95 scene units → 18.5° angle
- At ×3: Saturn z=0.319 × 5 × 3 = 4.78 scene units → 5.7° angle ✓

### Fix
Reduced multiplier from 10 to 3 in all 3 locations.

### Tests added (1 new)
- z-heights produce reasonable visual elevation angles (<10° for Saturn)

### Files changed
- `ts/src/orbital-3d-viewer-data.ts` — zFromAU multiplier 10→3
- `ts/src/orbital-3d-viewer-data.test.ts` — 1 new test
- `ts/src/templates.ts` — 3 inline occurrences 10→3
- `ts/examples/orbital-3d.html` — zFromAU multiplier 10→3

## Impact
- Human directive phase 30 item (1) addressed
