# Task 204: 3D Orbital Analysis Visualization in Reports

## Status: DONE
## Claimed by: Session (2026-02-28)
## Completed: 2026-02-28

## Objective
Render the existing 3D orbital analysis data (3d_orbital_analysis.json) as visual diagrams in episode reports. Currently the data exists but is not visualized.

## Scope
- Saturn ring plane crossing angle (23.9°) side-view diagram in cross-episode summary
- Uranus axial tilt approach geometry (97.8° / 54°) side-view diagram in cross-episode summary
- Ecliptic Z-height bar chart showing out-of-plane distances across the mission
- New SideViewDiagram type and rendering infrastructure in report pipeline
- 16 unit tests for side-view rendering

## Implementation
- Added `SideViewDiagram` and `SideViewElement` types to `report-types.ts`
- Added `renderSideViewDiagram` / `renderSideViewDiagrams` to `templates.ts`
- Added `sideview` directive to MDX parser (`mdx-parser.ts`)
- Wired rendering into `renderSummaryPage` section template
- Added two side-view diagrams and one bar chart to `cross-episode.md`

## References
- reports/data/calculations/3d_orbital_analysis.json (existing data)
- Task 098 remaining work items
