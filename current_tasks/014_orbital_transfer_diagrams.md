# Task 014: Orbital Transfer Diagrams in Reports

## Status: DONE

## Goal
Add inline SVG orbital transfer diagrams to episode reports, as per human directive.
Diagrams should show planetary orbits, celestial body positions, and transfer trajectories
to make the analysis visually understandable.

## Approach
- Static inline SVG generation in templates.ts (consistent with existing renderBarChart pattern)
- Top-down view of solar system using logarithmic or scaled coordinates
- Show departure/arrival orbits, transfer trajectory, and ΔV burn points
- Start with Episode 1 (Mars→Ganymede) and Episode 2 (Jupiter→Saturn)

## Progress
- [x] Design diagram data types in report-types.ts (Codex-reviewed)
- [x] Implement SVG orbital diagram renderer in templates.ts
- [x] Add diagram data to ep01.json (Mars→Ganymede: Hohmann + brachistochrone)
- [x] Add diagram data to ep02.json (Jupiter escape + heliocentric transfer, 2 diagrams)
- [x] Write tests for diagram rendering (17 new tests)
- [x] Verify all tests pass (309 total)

## Architecture
- New type `OrbitalDiagram` in report-types.ts with orbit definitions and transfer arcs
- New renderer `renderOrbitalDiagram` in templates.ts producing inline SVG
- Episode JSON files get a new `diagrams` field

## Depends on
- Task 005 (report pipeline)
- Task 006/013 (Episode 1 analysis)
- Task 008 (Episode 2 analysis)
