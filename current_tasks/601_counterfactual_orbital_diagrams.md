# Task 601: Add IF Counterfactual Orbital Diagrams to EP02-EP04

Status: **DONE**

## Background

DESIGN.md specifies: "軌道遷移に複数パターンがある場合、ひとつの軌道遷移図で複数パターンを同時にアニメーションさせると比較がわかりやすい"

EP01 (ep01-diagram-04: perijove vs high-altitude capture) and EP05 (ep05-diagram-03: flyby vs direct route) already have multi-scenario IF comparison diagrams using the `DiagramScenario` + `TransferArc.scenarioId` infrastructure.

EP02, EP03, and EP04 had textual IF exploration blocks but NO visual IF orbital diagrams. This task added them.

## Results

### EP02: Saturn Moon Capture Comparison (ep02-diagram-04)
- Saturn-centric diagram with 3 scenarios: Enceladus (canonical, green), Rhea (IF, yellow), Titan (IF, purple)
- v∞=4.69 km/s hyperbolic approach → capture at each moon orbit
- Demonstrates Oberth effect: deeper gravity well = lower capture ΔV

### EP03: Uranus Moon Destination Comparison (ep03-diagram-03)
- Uranus-centric diagram with 3 scenarios: Titania (canonical, green), Miranda (IF, blue), Oberon (IF, orange)
- Shows all 4 major Uranian moons + approach point
- Highlights infrastructure vs ΔV tradeoff

### EP04: Plasmoid Avoidance Route (ep04-diagram-03)
- Uranus magnetosphere-scale diagram with 2 scenarios: Shield breakthrough (canonical, green), Engine avoidance (IF, red)
- Shows plasmoid zone, magnetopause, and departure/exit points
- Visualizes the shield-vs-engine decision that determines EP05 survival

### Also fixed
- Pre-existing E2E test failure (3D viewer caption text mismatch)
- Added reference point IDs for new diagram markers

## Stats
- TS tests: 4,139 → 4,175 (+36 including auto-generated diagram validation)
- E2E tests: 290 (all pass, 1 pre-existing failure fixed)
- Total tests: 4,960 → 4,996
- Tasks: 600 → 601
