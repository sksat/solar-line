# Task 611: Earth Arrival 3D Scene

## Status: **DONE**

## Summary

Add an Earth-centric local 3D scene to complete the set of planetary arrival scenes in the 3D orbital viewer. Currently we have Jupiter capture, Saturn ring, and Uranus approach — but no Earth arrival scene for the dramatic EP05 conclusion.

## Scope

1. Create `prepareEarthArrivalScene()` in `orbital-3d-viewer-data.ts`
   - Earth-centric view showing LEO 400km parking orbit
   - EP05 arrival trajectory from Jupiter flyby
   - Moon (Luna) orbit for scale reference
   - IF counterfactual: direct route (nozzle fails 73 min before capture) vs canonical flyby route

2. Add "地球到着" button to standalone `orbital-3d.html`

3. Update EP05 inline 3D viewer to include earth-arrival scene in switcher

4. TDD: Write tests first for scene data structure and content

## Context

- EP05: Uranus → Jupiter flyby → Earth, 507h composite route
- LEO 400km insertion, nozzle destroyed on arrival
- IF direct route: nozzle fails 73 minutes before Earth capture
- The Earth arrival completes coverage of all major destination bodies
