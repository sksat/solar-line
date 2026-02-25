# Task 194: EP02 Counterfactual IF Analyses

Status: DONE

## Goal

Add counterfactual "IF" analyses (反事実分析) to EP02. Currently EP02 has only 1 IF analysis (ep02-exploration-04: alternative Saturn moon capture). All other episodes now have 2 IF analyses each. EP02 should match.

## Background

IF analysis coverage:
- EP01: 2 IFs (perijove vs high-altitude capture, 150h normal route)
- EP02: 1 IF (alternative moon capture) ← gap
- EP03: 2 IFs (wrong nav choice, alternative Uranus moon targets)
- EP04: 2 IFs (plasmoid evasion cascade, Titania stay analysis)
- EP05: 2 IFs (no Jupiter flyby direct route, nozzle-preserving safe route)

## EP02 IF Scenarios to Add

1. **What if partial thrust instead of trim-only during 455-day transit?**
   - The report already notes 1% thrust could cut transit to ~33 days
   - Explore: trim-only (455d actual), 10% thrust, 25% thrust, 50% thrust
   - Key question: Did きりたん have to endure 455 days, or could partial thrust (within damage constraints) have shortened the trip?
   - Cross-reference: frame stress 114%, cold sleep is explicitly depicted
   - Narrative implication: The 455-day ballistic choice was the safe choice for the damaged ship

2. **What if Jupiter escape velocity had been lower/higher?**
   - The 0.53 km/s solar escape velocity margin is flagged as critical
   - Explore: what minimum v∞ is needed to reach Saturn without correction burns?
   - What if escape velocity had been 0.5 km/s less? Would Saturn be unreachable?
   - Connects to the "no correction maneuver possible" constraint

## Approach

- Add ep02-exploration-05 and ep02-exploration-06 to ep02.md
- Follow the same MDX exploration format as existing IF analyses in other episodes
- Include scenario tables with quantitative results
- Reference existing calculations where possible (the 33-day figure is already computed)

## Dependencies

- EP02 report (ep02.md) — DONE
- EP02 calculations (ep01-05_calculations.json) — available
- Pattern: follow EP01/EP03/EP04 IF analysis format
