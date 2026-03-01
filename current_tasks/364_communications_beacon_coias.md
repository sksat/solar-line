# Task 364: Add Beacon Blackout and COIAS to Communications Report

## Status: DONE

## Description
The communications report is missing two key communication-infrastructure findings:

1. **EP05 STELLAR-INS AUTONOMOUS beacon blackout**: All 5 reference beacons (EARTH/MARS/JUPITER/SATURN/STELLAR-INS) shown as UNAVAILABLE on HUD. The most dramatic communication-infrastructure event in the series — Kestrel navigates 18.2 AU with zero external reference.
2. **EP02 COIAS orbital-cross alert system**: Real-world Subaru Telescope system name (COIAS) repurposed as collision alert. Communication/navigation infrastructure element absent from the report.

## Changes
- `reports/data/summary/communications.md`: Beacon blackout + COIAS sections
- `ts/src/article-content-validation.test.ts`: TDD content tests
- `reports/data/summary/tech-overview.md`: Stats refresh
