# Task 049: Orbital Diagram Scale Legend and Timeline Annotations

## Status: DONE

## Goal
Enhance orbital diagrams with two improvements from the full_route_enhancements.md idea:

1. **Scale legend**: Add distance markers (in AU) and label the scale mode (sqrt/linear/log) so readers understand the diagram geometry is topological, not to true physical scale.

2. **Timeline annotations**: Add elapsed-time labels at key waypoints on the full-route diagram (e.g., T+0 at Mars departure, T+72h at Ganymede, T+456d at Enceladus, etc.), making the journey progression visible.

Both improvements make the cross-episode summary's full-route diagram significantly more informative.

## Approach
- Extend `OrbitalDiagram` type with optional `scaleLegend` and `timelineAnnotations`
- Add SVG rendering for scale legend (distance markers + scale mode label)
- Add SVG rendering for timeline annotations (labels at specific positions/angles)
- Update cross-episode.json full-route diagram data with timeline info
- TDD: write tests first, then implement

## Depends on
- Task 043 (full route diagram) — DONE
- Task 040 (engine burn visualization) — DONE
