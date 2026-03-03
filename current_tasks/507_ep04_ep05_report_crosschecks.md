# Task 507: EP04/EP05 Calc JSON → Report Cross-Checks

## Status: DONE

## Summary

Added 10 cross-checks verifying that EP04/EP05 calc JSON values appear correctly in their respective episode reports and in science-accuracy.md.

## Tests Added

### EP04 (3 tests)
- Worst-case radiation 1008 mSv cited in ep04.md
- En-route cumulative dose 48 mSv cited in ep04.md
- Thermal margin 78% matches analysis and cited in report

### EP05 (5 tests)
- Nozzle sensitivity: 1% increase → -427s margin cited in ep05.md
- Navigation angular accuracy 7.35 nrad cited in ep05.md
- Furthest point 19.2 AU cited in ep05.md
- Oberth best-case efficiency ~0.078% cited in ep05.md
- EP03 navigation comparison factor ~290万 cited in ep05.md

### Science-accuracy (2 tests)
- Cumulative time dilation ~155 seconds cited in science-accuracy.md
- Cumulative time dilation ~2.6 minutes cited in science-accuracy.md

## Impact

Catches drift between calc JSON outputs and episode/summary report prose. Ensures worst-case radiation, nozzle sensitivity scenarios, and relativistic cumulative dilation stay consistent across analysis and reporting layers.
