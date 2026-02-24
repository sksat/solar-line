# Task 158: Cross-Episode Mass Timeline Visualization

## Status: DONE

## Motivation

CLAUDE.md directs: "Track container jettison, propellant consumption, and damage-related mass changes as time series. Model multiple scenarios (nominal mass, 299t limit, optimized propellant allocation) and visualize with comparison charts."

The cross-episode report discusses propellant budget textually but has no mass timeline chart showing mass evolution across the full 479-day mission. This is explicitly a gap identified in the report review.

## Scope

1. Collect mass data points from all episode calculations and on-screen cross-references
2. Create a uPlot time-series chart showing mass evolution over the full mission timeline
3. Model multiple scenarios:
   - Scenario A: Nominal mass (starting from ~48,000t)
   - Scenario B: True operational mass (~300t class, from brachistochrone analysis)
   - Scenario C: Mass with container jettison events
4. Add the chart to the cross-episode summary report
5. Include mass events: burns, container jettisons, Enceladus resupply, damage

## Dependencies

- EP01-EP05 calculations (all DONE)
- On-screen crossref data (all DONE)
- Propellant budget analysis in cross-episode report (DONE, text only)
- mass_timeline.rs Rust module (DONE)
