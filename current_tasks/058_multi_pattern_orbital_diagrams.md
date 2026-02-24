# Task 058: Multi-Pattern Orbital Diagram Animation

## Status: DONE

## Motivation
Human directive: 軌道遷移に複数のパターンがある時は、ひとつの軌道遷移図で複数パターンを同時に動かすとわかりやすい。

## Implementation

### Type Extensions (report-types.ts)
- `scenarioId?: string` on `TransferArc` — groups arcs into named scenarios
- New `DiagramScenario` interface (`id`, `label`) for scenario metadata
- `scenarios?: DiagramScenario[]` on `OrbitalDiagram` — defines multi-pattern mode

### Renderer (templates.ts)
- Scenario-aware legend: when `scenarios` present, shows scenario labels instead of transfer style labels
- Non-primary scenario arcs: `stroke-width="1.5"`, `stroke-opacity="0.6"` (visually distinguished)
- `data-scenario` attribute on SVG paths for CSS/JS targeting
- Animation JSON embeds `scenarioId` and `scenarios` array for browser-side logic

### Animation (orbital-animation.js)
- Reads `scenarios` and `scenarioId` from animation data
- Non-primary scenario ship markers: smaller radius (4 vs 5), reduced opacity (0.7), thinner stroke
- All scenario arcs animate simultaneously — viewer sees both routes moving in parallel

### New Diagrams
1. **EP01 `ep01-diagram-02`**: 72h（299t, 3.34g）vs 150h（1,297t, 0.77g）質量シナリオ比較
   - Same Mars→Jupiter path, different burn durations and g-loads
   - Primary (green) = 72h in-story route; Alt (purple) = 150h "normal route"

2. **EP05 `ep05-diagram-03`**: 木星フライバイ vs 直行ルート IF分析
   - Flyby route: Uranus→Jupiter→Earth (2 legs, red/orange), 507h, nozzle margin 26min
   - Direct route: Uranus→Earth (1 leg, gray), nozzle fails 73min before arrival
   - Visually demonstrates why Jupiter flyby was mandatory, not optional

## Test Results
- 1002 TS tests, 153 Rust core, 34 WASM = 1189 total (0 failures)
- Build: 5 episodes, 8 summaries — all rendering correctly
