# Task 418: Add Auxiliary Episode Data Validation Tests

## Status: **DONE**

## Summary

The auxiliary episode data files (`epXX_speakers.json`, `epXX_onscreen_data.json`) have no structural validation tests. Add tests verifying: required fields, speaker ID consistency with dialogue files, onscreen data frame structure, and cross-episode speaker consistency.

## Rationale
- Speakers files define the character IDs used throughout the pipeline — invalid data breaks dialogue attribution
- Onscreen data captures HUD readings and visual observations — validates source material
- These files are loaded by build/render pipeline but never validated independently
- Consistent with Tasks 416-417 pattern (data file validation)
