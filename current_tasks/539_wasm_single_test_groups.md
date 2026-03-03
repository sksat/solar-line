# Task 539: Eliminate Remaining WASM Single-Test Groups

## Status: DONE

## Summary

Added second tests to 5 WASM bridge groups that had only 1 assertion each:

1. propagate_mean_anomaly: full orbit returns to starting anomaly
2. specific_angular_momentum: eccentric orbit has lower h than circular at same a (ratio = sqrt(1-e²))
3. brachistochrone_max_distance: double acceleration covers double distance
4. brachistochrone_time: zero distance gives zero time
5. speed_of_light: consistent with light_time calculation at 1 AU

## Impact

All 5 groups now have behavior-validating tests, not just schema checks. 0 single-assertion WASM groups remain.
