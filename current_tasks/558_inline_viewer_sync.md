# Task 558: Sync inline 3D viewer with new features (Tasks 554-557)

## Status: DONE

## Summary

The inline 3D viewer (`3d-viewer:` directive in reports) had duplicated scene preparation
logic in templates.ts that was out of sync with the data layer improvements from Tasks 554-557.

### Fixes applied to templates.ts inline viewer:
1. **Moon positions**: Enceladus and Titania now positioned at 45° on orbit (was 0,0,0)
2. **Orbit circles**: Full-route scene includes orbitCircles for all 5 planets
3. **Local scene timelines**: Saturn/Uranus scenes include timeline data for animation
4. **View mode**: All scenes support inertial/ship viewpoint switching via button
5. **Stats refresh**: Updated tech-overview.md (4,031 TS, 557 tasks, 728 commits)

### Files changed
- `ts/src/templates.ts` — inline viewer scene prep + view mode button + handler
- `reports/data/summary/tech-overview.md` — stats refresh

## Impact
- Inline 3D viewer in cross-episode.md now matches standalone orbital-3d.html features
