# Task 161: Multi-Scenario Orbital Diagram UI

## Status: DONE

## Motivation

DESIGN.md specifies: "軌道遷移に複数パターンがある場合、ひとつの軌道遷移図で複数パターンを同時にアニメーションさせると比較がわかりやすい。"

Two orbital diagrams already have multi-scenario data:
- EP01 `ep01-diagram-02`: 72h vs 150h mass scenarios (brachistochrone comparison)
- EP05 `ep05-diagram-03`: Jupiter flyby vs direct route (IF analysis)

The data structures (`DiagramScenario`, `scenarioId` on transfers) exist, and `orbital-animation.js` already reads them — but the animation code only applies visual differentiation (smaller markers for alt scenarios). There's **no UI to toggle scenarios on/off or switch between them**.

## Scope

1. Add scenario toggle buttons to the animation controls bar
2. Toggling a scenario shows/hides its transfer arcs and ship markers
3. CSS for toggle buttons (active/inactive state)
4. E2E or unit test for scenario toggle rendering
5. Verify both EP01 and EP05 diagrams work correctly

## Dependencies

- orbital-animation.js (existing)
- templates.ts OrbitalDiagram rendering (existing)
- EP01/EP05 multi-scenario diagram data (existing)
