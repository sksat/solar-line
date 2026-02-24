# Task 042: Update Summary Reports with Confirmed EP05 Data

## Status: DONE

## Problem
The three summary reports (`cross-episode.json`, `ship-kestrel.json`, `science-accuracy.json`) contain 24+ "※暫定" and "字幕データ未取得" markers for EP05 data. These were written when EP05 analysis was incomplete (no subtitle/dialogue data). Now that EP05 is fully analyzed (Task 023 complete, dialogue attribution done), these markers are stale and need to be replaced with confirmed data.

## Scope
1. **cross-episode.json**: Remove all "※暫定" markers, update EP05 cells with confirmed values:
   - Thrust: 6.37 MN (65%) — confirmed
   - Mass boundary: ≤300t — confirmed
   - Engine state: damaged (65% output), nozzle destroyed — confirmed
   - Transfer time: 507h composite route — confirmed
   - Verdict: update from "暫定: 条件付き" to actual verdicts
   - Brachistochrone ΔV: 15,207 m/s (300t) — confirmed
   - Required acceleration: 2.17 m/s² (300t) — confirmed
   - Physical limits: 4 burns, 55h38m nozzle margin — confirmed
   - Update summary text removing "字幕データ未取得" disclaimer

2. **ship-kestrel.json**: Update EP05 cells, remove provisional markers from timeline/conclusion

3. **science-accuracy.json**: Update Earth capture ΔV verification from "unverified" to "verified", update EP05 brachistochrone data, remove provisional markers

## Done Criteria
- Zero "※暫定" markers remaining in summary reports
- Zero "字幕データ未取得" text remaining
- All EP05 data reflects confirmed analysis from ep05.json
- All tests pass, site builds cleanly
