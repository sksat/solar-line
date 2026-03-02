# Task 481: Add Related Pages Sections to Summary Reports

## Status: DONE

## Summary

4 key summary reports (ship-kestrel, communications, attitude-control, infrastructure) lack "関連ページ" sections and have no links to episode reports. Add navigation sections linking to relevant episodes and other summaries.

Per-summary relevant links:
- ship-kestrel: EP01-EP05 (all episodes reference Kestrel), cross-episode, science-accuracy
- communications: EP03 (FSOC), EP05 (beacon blackout), infrastructure, attitude-control
- attitude-control: EP01 (flip), EP04 (asymmetry), EP05 (nozzle degradation), ship-kestrel
- infrastructure: EP02 (Enceladus), EP03 (outer-sphere), EP05 (beacon network), communications

## Plan

1. Write content validation tests (TDD red)
2. Add "関連ページ" sections to 4 summary reports
3. Verify tests pass (TDD green)
4. Commit

## Impact

- Improves bidirectional navigation between episodes and summaries
- Readers can easily discover relevant episode analyses from summary pages
