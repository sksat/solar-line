# Task 039: Expand Cross-Episode Analysis Beyond Episode-Based Structure

## Status: TODO

## Motivation
Human directive: "クロスエピソード分析はそれ単体だけでなく、各船の仕様など、エピソード以外の観点からも柔軟に行ってよい"

The current cross-episode analysis (`reports/data/summary/cross-episode.json`) is structured around comparing metrics across episodes. The human wants additional analysis dimensions:
- Ship specifications (Kestrel mass/thrust evolution, damage accumulation)
- Character-level analysis (dialogue patterns, decision-making)
- Technology consistency (fusion propulsion, navigation systems)
- Route planning (full solar system journey optimization)
- Physical science accuracy (real vs. depicted values)

## Scope
1. Add ship-focused summary pages (Kestrel specs across episodes)
2. Add technology/physics accuracy summary
3. Add route optimization analysis (was the overall journey optimal?)
4. Extend `generate-cross-episode.ts` or create new summary generators
5. Update the summary page template system to support multiple summary reports

## Depends on
- Cross-episode analysis infrastructure (Task 021)
- All episode analyses
