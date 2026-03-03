# Task 571: Fill unit test gaps for 3D viewer data

## Status: DONE

## Summary

Added 4 tests covering gaps identified during code review:
- Uranus scene supportedViewModes assertion
- LOCAL_SCENE_SCALE and AU_TO_SCENE constant values
- OrbitCircle z-heights match corresponding planet z-heights

### Tests added (4 new)
- `orbital-3d-viewer-data.test.ts`: Uranus view modes, constant values (×2), orbit circle z consistency

### Files changed
- `ts/src/orbital-3d-viewer-data.test.ts` — 4 new tests

## Impact
- Test coverage: 4,052 TS tests (+4)
