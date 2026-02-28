# Task 206: EP02 455-Day Transfer Fundamental Rethink

## Status: IN PROGRESS

## Priority: CRITICAL — Human directive (phase 16)

## Objective
The 455-day ballistic Jupiter→Saturn transfer is narratively unacceptable despite being physically plausible. Rethink from scratch, including celestial position epoch search, to find a transfer that works narratively AND physically.

## Problem
- 455 days is ~95% of the entire 479-day mission — dominates the timeline
- Even with cold sleep depicted in EP02, a 1.25-year passive drift feels inconsistent with the series' pacing
- The current calculation uses a simple average-velocity approximation for a solar-hyperbolic trajectory
- No systematic search of departure epochs / celestial configurations has been performed

## Approach
1. **Understand anime constraints**: Re-examine EP02 dialogue for constraints on transfer duration
   - What does the series actually say about how long this takes?
   - Are there time markers (dates, "X days later") in dialogue?
2. **Epoch search**: Systematically search for Jupiter-Saturn configurations that minimize ballistic transfer time
   - Vary departure epoch across the 2241-2242 range
   - Consider gravity assists (Saturn's moons, Jupiter flyby geometry)
   - Account for real Jupiter-Saturn synodic period effects
3. **Alternative transfer types**: Explore beyond pure ballistic
   - Partial thrust (1-5% capacity) with damaged engines
   - Jupiter gravity assist optimization (departure direction/velocity)
   - Multi-body flyby sequences
4. **Recalculate with proper orbit propagation**: Use Rust numerical integration instead of average-velocity approximation
5. **Update all downstream**: EP02 report, cross-episode analysis, timeline, DAG

## Key Parameters (Current)
- Departure: Jupiter 50 RJ, v∞ = 5.934 km/s, heliocentric v = 18.990 km/s
- Arrival: Saturn/Enceladus, v∞ = 4.691 km/s
- Transit: 455.26 days (current calculation)
- Distance: Jupiter orbit (5.20 AU) → Saturn orbit (9.58 AU) = 4.38 AU radial

## Key Files
- `ts/src/ep02-analysis.ts` (current calculation)
- `reports/data/episodes/ep02.md` (report)
- `reports/data/calculations/ep02_calculations.json` (calculation output)
- `reports/data/summary/cross-episode.md` (summary references)
- `ts/src/timeline-analysis.ts` (mission timeline)
- `crates/solar-line-core/src/orbits.rs` (Rust orbital mechanics)

## References
- Human directive (phase 16): "455日の遷移はやはり物語として成立しにくく、許容できない。天体の位置関係の時期捜索を含め根本から考え直すべき。"
- CLAUDE.md: "描写整合性優先 (timeline > G-tolerance)"
