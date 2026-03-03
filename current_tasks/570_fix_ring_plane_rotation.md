# Task 570: Fix ring/plane geometry rotation bug in 3D viewer

## Status: DONE

## Summary

Ring and tilted plane geometry had incorrect orientation because:
1. Normal vectors weren't y/z swapped for Three.js coordinate system
2. Ring had an extra -90° X rotation compounding with the quaternion

### Root cause
- Data normals are in scene coords (x,y,z) but Three.js uses Y-up (swaps y/z)
- `addRing()` computed quaternion from unswapped normal then added extra rotateX
- `addTiltedPlane()` computed quaternion from unswapped normal
- `addAxis()` already correctly swapped y/z (line 408) — inconsistency

### Fix
- Both `addRing()` and `addTiltedPlane()` now swap y/z before quaternion computation
- Removed extra `rotateX(-Math.PI/2)` from ring rendering
- Now consistent with `addAxis()` y/z swap pattern

### Files changed
- `ts/src/orbital-3d-viewer.js` — fixed addRing and addTiltedPlane normal handling

## Impact
- Saturn ring plane and Uranus equatorial plane now correctly oriented
