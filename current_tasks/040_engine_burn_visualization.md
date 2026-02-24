# Task 040: Engine Burn Visualization in Interactive Orbital Diagrams

## Status: DONE

## Motivation
Human directive: "インタラクティブ軌道遷移グラフにおいて、エンジン点火の描写がほしい"

## Implementation (Codex design-reviewed)

### BurnMarker Type Extension
- Added `BurnType` = "acceleration" | "deceleration" | "midcourse" | "capture"
- Added `startTime?`, `endTime?` (transfer-relative seconds), `type?` to BurnMarker
- Fully backward-compatible: existing static markers still work

### Animation Engine (orbital-animation.js)
- Exhaust plume: SVG wedge polygon trailing ship marker, oriented via path tangent
- Path tangent computed from getPointAtLength(s±eps) finite differences
- Burn type → color mapping: acceleration=orange, deceleration=cyan, midcourse=yellow, capture=magenta
- Plume flicker: subtle opacity oscillation (0.75 + 0.25·sin(20t))
- Ship marker enlarges (r=6) and glows with burn color during active thrust
- Burn label text displayed above ship during active burns
- Brachistochrone fallback: auto-infers acc/dec halves when no explicit burns

### Templates
- Animation JSON now includes `burns[]` per transfer and `style` field
- CSS: `.burn-plume`, `.burn-label-text` classes

### Episode Data Updates
All animated diagrams now have burn timing:
- EP01: 3 burns (acc + midcourse turnover + dec, 72h brachistochrone)
- EP02: 2 burns (departure impulse, capture impulse)
- EP03: 3 burns (acc + dec brachistochrone, capture impulse)
- EP04: 3 burns (65% thrust acc + dec, departure impulse)
- EP05: 2 burns (acc + dec, 8.3d @300t brachistochrone)

### Tests
- 6 new tests in templates.test.ts (burns in animation JSON, filtering, CSS)
- 820 TS + 79 Rust = 899 total, 0 failures

## Depends on
- Interactive orbital animation (Task 019) — DONE
- Report types and templates (report-types.ts, templates.ts)
