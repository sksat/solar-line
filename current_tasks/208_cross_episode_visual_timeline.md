# Task 208: Cross-Episode Visual Timeline

## Status: NOT STARTED

## Priority: MEDIUM

## Objective
Create a comprehensive cross-episode timeline visualization showing the full mission with all transfers, events, and key parameters.

## Scope
1. **Timeline chart**: uPlot time-series chart spanning full mission (2241-09-05 → 2242-12-28)
   - X-axis: mission elapsed time (days)
   - Regions/bands for each episode
   - Transfer events with ΔV markers
   - Key narrative events (damage, cold sleep, plasmoid encounter)
2. **Parameter tracks**: Multiple synchronized time-series
   - Ship velocity (heliocentric)
   - Distance from Sun
   - Accumulated ΔV
   - Mass budget over time
   - Radiation dose accumulation
   - Nozzle remaining life
3. **Orbital position track**: Small orbital diagram showing ship position at each timestamp
4. **Interactive**: Scrub timeline to see ship position, click events to jump to episode analysis
5. **Integration**: Embed in cross-episode summary report

## Key Files
- `ts/src/timeline-analysis.ts` (mission timeline computation)
- `reports/data/summary/cross-episode.md` (target report)
- `ts/examples/uplot.html` (uPlot example)
- `ts/src/templates.ts` (report rendering)

## Dependencies
- Task 206 (455-day rethink) will change the timeline significantly
- Should be implemented AFTER Task 206 is resolved
