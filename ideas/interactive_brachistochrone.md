# Interactive Brachistochrone Calculator

Add an interactive WASM-powered brachistochrone calculator to the Episode 1 report page.
Users could adjust:
- Mars-Jupiter distance (slider for planetary geometry)
- Ship mass (to explore the mass ambiguity)
- Transfer time (to compare 72h vs 150h vs custom)

The calculator would show required acceleration, ΔV, and comparison with Kestrel's specs.

Implementation:
- Add brachistochrone functions to solar-line-wasm
- Load WASM on the episode page
- Simple sliders + output table

## Status: RESOLVED

Implemented as Task 007. Calculator rendered on all episode pages with
per-episode presets, WASM/JS fallback, thrust slider, preset buttons, and verdict display.
See `ts/src/calculator.js` and `renderCalculator()` in `ts/src/templates.ts`.
