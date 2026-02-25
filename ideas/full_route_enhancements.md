# Idea: Full-Route Diagram Enhancements

## Current State
- Full-route orbital diagram added to cross-episode summary (Task 025)
- Heliocentric, sqrt scale, animated with 4 transfer legs
- Shows Mars/Jupiter/Saturn/Uranus/Earth orbits with brachistochrone/ballistic arcs
- Scale legend, timeline annotations, epoch annotations all implemented

## Completed Enhancements

1. **Moon-local insets**: ✅ DONE (per-episode diagrams exist for all systems)
   - Ganymede approach (Jupiter system) — Task 162, added ep01-diagram-03
   - Jupiter escape — ep02-diagram-01
   - Enceladus capture (Saturn system) — ep02-diagram-03
   - Titania approach/departure (Uranus system) — ep03-diagram-02, ep04-diagram-02, ep05-diagram-04
   - Earth capture (Moon orbit) — ep05-diagram-02

2. **Staged highlighting**: ✅ DONE (Task 162)
   - Transfer arcs wrapped in `<g class="transfer-leg">` groups
   - Hover/click to highlight individual legs (CSS + JS)
   - Tooltip shows leg label, click-to-lock interaction

3. **Scale legend**: ✅ DONE (Task 049)
   - ScaleLegend type with reference distances in AU
   - Note about topological (not physical) scale

4. **Timeline annotations**: ✅ DONE (existing task)
   - TimelineAnnotation badges on diagram + horizontal timeline bar
   - Mars departure → Ganymede → Saturn → Uranus → Earth waypoints

## Remaining Ideas
- Cross-episode full-route diagram could include small inset sub-diagrams (picture-in-picture) rather than separate diagrams
- Leg highlighting could include episode navigation links (click a leg → go to that episode's analysis)
