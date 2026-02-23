# Task 019: 軌道遷移図のインタラクティブアニメーション

## Status: DONE

## Human Directive
軌道遷移の図に、時間を操作できるインタラクティブ要素を追加する。
時間スライダーで遷移の進行を操作し、その間の天体との位置関係がどう変わるかを視覚的にわかりやすくする。

## Implementation Summary

### Design (Codex-reviewed)
- Canonical timeline: t in seconds from 0 to durationSeconds
- Animation data as `<script type="application/json">` per diagram, `data-animated="true"` as discovery flag
- Ship position via `getPointAtLength()` along actual SVG transfer paths (avoids physics/rendering mismatch)
- Body positions via `angle + meanMotion * t` (circular orbit approximation)

### Changes
1. **report-types.ts**: Added `AnimationConfig` type, `meanMotion?` to OrbitDefinition, `startTime?`/`endTime?` to TransferArc, `animation?` to OrbitalDiagram
2. **templates.ts**: Updated `renderOrbitalDiagram()` for animated mode — adds `data-animated`, `data-orbit-id`, `data-transfer-path` attributes, embeds animation JSON, renders slider/play controls. Added CSS for animation controls.
3. **orbital-animation.js**: New browser module — discovers animated diagrams, creates time slider + play/pause, animates body positions and ship markers using requestAnimationFrame
4. **build.ts**: Copies orbital-animation.js to dist/
5. **Episode reports**: All 5 diagrams across ep01-03 now have animation data (meanMotion, startTime/endTime, animation config)

### Test Coverage
- 15 new tests in templates.test.ts (all passing)
- Total: 346 TS tests (343 pass, 3 pre-existing build test failures)
- Rust: all passing

## Depends on
- Task 014 (orbital diagrams — DONE)
