# Task 239: Add Margin Gauges to Episode Reports

## Status: DONE

## Description

Extend the margin gauge visualization (Task 238) to episode reports (EP04 and EP05). These episodes have the most dramatic "ギリギリ" margins and would benefit most from the visual component.

## Scope

### EP04: Plasmoid encounter margins
- Shield life: 14 min available vs 8 min needed (43% margin)
- Radiation dose: 480 mSv vs 500 mSv ICRP emergency limit (4% margin)
- Coil loss timing

### EP05: Final approach margins
- Nozzle life: 55h38m vs 55h12m needed (0.78% margin)
- Jupiter Oberth effect: critical for feasibility
- Mass boundary considerations

### Implementation
- Add margin-gauge support to episode-mdx-parser.ts
- Add gauge data to EP04 and EP05 reports
- E2E tests for episode page gauges
- Article content tests for gauge data
