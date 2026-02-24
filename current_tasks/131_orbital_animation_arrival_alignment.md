# Task 131: 軌道遷移アニメーション到着位置の修正

## Status: TODO

## Human Directive
「軌道遷移アニメーションにおいて、遷移後に到達すべき天体との位置関係がおかしいことが多い」

## Scope
1. Audit all animated orbital diagrams (EP01-05) for arrival position misalignment
2. Identify the root cause: likely meanMotion calculation or animation endpoint timing
3. Write regression tests that verify ship position at transfer end matches destination body position
4. Fix the animation data (meanMotion, startTime, endTime) or animation logic
5. Verify visually that transfers end at the correct destination body

## Technical Notes
- Animation uses `getPointAtLength()` for ship, `angle + meanMotion * t` for bodies
- Transfer arcs have `startTime`/`endTime` — the ship at `endTime` should be near the destination body
- The issue is likely that body orbital motion during the transfer isn't properly synchronized with the transfer arc endpoint
- Need to ensure: at t=endTime, destination body angle ≈ transfer arc endpoint angle

## Dependencies
- Task 019 (interactive orbital animation — DONE)
- Task 097 (epoch-consistent diagram angles — DONE)
- Task 040 (engine burn visualization — DONE)
