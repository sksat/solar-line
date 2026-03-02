# Task 480: Add Cross-Reference Sections to Episode Reports

## Status: DONE

## Summary

No episode report links to the summary reports (ship-kestrel, communications, attitude-control, infrastructure, other-ships), despite all summaries heavily referencing episodes. Add "関連する総合分析" section before the glossary in each episode with relevant summary links.

Per-episode relevant summaries:
- EP01: ship-kestrel (mass mystery origin), cross-episode (chain probability), science-accuracy
- EP02: ship-kestrel (trim-thrust), infrastructure (Enceladus station), other-ships (large vessel encounter)
- EP03: communications (FSOC analysis), attitude-control (navigation precision), infrastructure (outer-sphere beacon network)
- EP04: attitude-control (RCS escalation), ship-kestrel (nozzle damage), other-ships (fleet pursuit), science-accuracy (plasmoid)
- EP05: ship-kestrel (nozzle life limit), communications (all-beacon blackout), attitude-control (final approach), cross-episode (full route)

## Plan

1. Write content validation tests (TDD red)
2. Add cross-reference sections to all 5 episodes
3. Verify tests pass (TDD green)
4. Commit

## Impact

- Improves navigation between episode and summary reports
- Helps readers discover relevant cross-cutting analysis
