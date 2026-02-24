# Task 159: Cross-Episode Counterfactual Analysis Section

## Status: DONE

## Motivation

CLAUDE.md directs: "Explore IF scenarios — what would happen if characters had made different decisions?"

Per-episode reports contain local counterfactuals (e.g., EP05's no-flyby analysis), but the cross-episode summary report has no cross-episode counterfactual section comparing alternative mission profiles. For example:
- What if Kestrel had taken a direct brachistochrone from Mars to Earth?
- What if there was no Enceladus resupply?
- What if the ship had bypassed Titania?

These mission-level "what if" scenarios deepen the analysis by putting the actual route in perspective.

## Scope

1. Add a "反事実分析: もし別のルートを選んでいたら？" section to cross-episode.json
2. Analyze 3-4 alternative mission profiles:
   - Direct Mars→Earth brachistochrone (no intermediate stops)
   - No Enceladus resupply scenario
   - Direct Saturn→Earth (bypass Titania/Uranus)
3. Compare ΔV, travel time, propellant requirements with actual route
4. Include a bar chart comparing scenarios

## Dependencies

- Cross-episode analysis (DONE)
- Propellant budget section (DONE, with new mass timeline from Task 158)
- EP05 counterfactual (direct brachistochrone, DONE in EP05 detail page)
