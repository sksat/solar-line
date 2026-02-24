# Task 040: Engine Burn Visualization in Interactive Orbital Diagrams

## Status: TODO

## Motivation
Human directive: "インタラクティブ軌道遷移グラフにおいて、エンジン点火の描写がほしい"

The current interactive orbital diagrams show transfer arcs and body positions with animation, but do not visually depict engine burns (ignition/shutdown events). Adding burn visualization would make the diagrams more informative and engaging.

## Scope
1. Extend BurnMarker type in report-types.ts if needed
2. Add visual burn indicators (flame/thrust icon, color change, or particle effect) at burn start/stop points
3. During animation, show active thrust as a visual effect on the ship marker
4. Coordinate burn timing with the existing AnimationConfig / time slider
5. Update existing diagrams across all episodes

## Depends on
- Interactive orbital animation (Task 019) — DONE
- Report types and templates (report-types.ts, templates.ts)
