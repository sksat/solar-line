# Task 534: Cross-Report Value Consistency Tests

## Status: DONE

## Summary

The "cross-report value consistency" describe block currently only checks ship-kestrel + cross-episode + tech-overview. Several key numerical values appear in 4-6 reports but aren't cross-checked. Add multi-file consistency assertions.

## Tests to Add

### Nozzle margin across 4+ reports
- 26 min / 0.78% in: ship-kestrel, ep05, science-accuracy, attitude-control (currently only cross-episode)

### Total route distance 35.9 AU across 3+ reports
- ship-kestrel, ep05, science-accuracy (currently only cross-episode)

### 124-day mission duration across 3+ reports
- ep05, communications (currently only cross-episode)

### 480 mSv plasmoid dose across 4+ reports
- ep04, ship-kestrel, science-accuracy, communications (currently only cross-episode)

### EP02 87-day trim-thrust across 3+ reports
- ship-kestrel, science-accuracy, communications (currently only cross-episode)

## Impact

Prevents silent value drift when one report is updated but others aren't.
