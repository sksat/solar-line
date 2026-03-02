# Task 374: Add Brachistochrone Velocity Profile Charts to EP01 and EP04

## Status: DONE

## Motivation

EP03 has a brachistochrone velocity profile time-series chart showing velocity evolution during the Saturn→Uranus transfer. EP02 has a velocity profile for the trim-thrust transfer. EP05 has a nozzle life chart. EP04 has a radiation dose chart.

However, EP01 (Mars→Ganymede, 72h brachistochrone) and EP04 (Titania→Earth, 65% thrust) lack velocity profile charts despite involving significant brachistochrone transfers. CLAUDE.md says "More figures are better than fewer" and "Concrete values need visualization."

## Changes

1. **EP01 velocity profile chart** (`ep01-chart-velocity-profile`):
   - 72h brachistochrone at 299t, 9.8 MN → peak 4,248 km/s (1.42% c)
   - 21 data points with midpoint flip annotation
   - Error bands: mass ±10% (269-329t)

2. **EP04 thrust comparison chart** (`ep04-chart-thrust-comparison`):
   - Compares 100% thrust (9.8 MN, 160h, peak 9,431 km/s) vs 65% thrust (6.37 MN, 199h, peak 7,604 km/s) at 300t
   - Shows +24% transit time increase and -19% peak velocity reduction from thrust limitation
   - Error bands on 65% profile for mass ±10%
   - Dual midpoint flip annotations

3. **TDD tests** in `article-content-validation.test.ts`:
   - EP01: 3 new tests (chart presence, peak velocity, axis labels)
   - EP04: 2 new tests (chart presence, 100%/65% comparison)

Total: +5 new content validation tests, all 2,499 TS tests pass, 398 Rust tests pass.

## Non-goals

- Changing existing charts in other episodes
- Adding new orbital diagrams
