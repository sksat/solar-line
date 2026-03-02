# Task 378: Standalone Brachistochrone Calculator Page

## Status: DONE

## Goal
Create a dedicated standalone interactive brachistochrone calculator page at `/calculator/` on the site. Currently the calculator is embedded within episode pages — a standalone version allows readers to freely explore transfer physics across all episodes without navigating away from the analysis context.

## Features
- All episode presets (EP01-EP05) grouped by episode with labels
- Cross-episode comparison mode (compare two transfers side by side)
- Real-time parameter adjustment with sliders (distance, mass, time, thrust)
- WASM-first calculation with JS fallback
- Verdict badge (plausible/marginal/implausible)
- Educational section explaining the brachistochrone model and assumptions
- Full site navigation integration (linked from "この考証について" dropdown)

## Implementation
1. Add `renderCalculatorPage()` to templates.ts
2. Add build step to build.ts
3. Create calculator-standalone.js module
4. Add nav link in layoutHtml metaLinks
5. Add E2E tests
6. Add content validation tests
