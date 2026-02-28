# Task 205: Orbital Animation Arrival Alignment Verification & Tests

## Status: DONE

## Priority: HIGH

## Objective
Fix and systematically test orbital animation arrival alignment — destination bodies must be at the correct position when the transfer animation completes.

## Problem
- Orbital transfer diagrams show destination bodies that have already moved past the arc endpoint after animation completes
- Cross-episode diagrams have arrival positions that don't match the next episode's departure position
- The current unit tests verify static SVG endpoint alignment but NOT animated body position at arrival time
- No integration test verifies `initialAngle + meanMotion * duration == arrivalAngle`

## Scope
1. **Audit all diagrams**: Check every orbital diagram's animation data — verify that `meanMotion * transferDuration` brings each body to its `arrivalAngle`
2. **Add animation arrival test**: Test that animated body position at `t=transferDuration` matches SVG path endpoint within tolerance
3. **Cross-episode continuity test**: Verify that EP(N) arrival body position == EP(N+1) departure body position
4. **Fix misaligned diagrams**: Update animation parameters where they're incorrect
5. **E2E visual regression**: Add Playwright test that captures body positions at animation end

## Key Files
- `ts/src/orbital-animation.js` (browser animation logic)
- `ts/src/templates.ts` (SVG path generation, animation data embedding)
- `ts/src/templates.test.ts` (existing alignment tests, lines 4386-4628)
- `ts/src/update-diagram-angles.ts` (ephemeris → diagram angles)
- `ts/src/update-diagram-angles.test.ts` (ephemeris validation)
- `ts/e2e/examples.spec.ts` (E2E animation tests)

## Dependencies
- Task 206 (455-day rethink) may change EP02 parameters — coordinate arrival angles accordingly
