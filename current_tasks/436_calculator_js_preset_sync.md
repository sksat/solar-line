# Task 436: Sync Calculator.js Presets from Templates.ts

## Status: **DONE**

## Summary

`calculator.js` (browser runtime) has its own hardcoded copy of `EPISODE_PRESETS` with ship parameters (48000t, 9.8 MN, 6.37 MN). These duplicate what `templates.ts` now derives from KESTREL constants. Make `templates.ts` inject the preset data as inline JSON that `calculator.js` reads, eliminating the duplication.

## Approach

1. In `templates.ts`, serialize the presets into a `<script type="application/json" id="calc-presets-data">` tag
2. In `calculator.js`, read presets from the data tag instead of hardcoding them
3. Add a test to verify the data injection works
