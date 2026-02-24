# Task 156: Interactive Brachistochrone Calculator

## Status: DONE (already implemented as Task 007)

## Motivation

The `ideas/interactive_brachistochrone.md` describes an interactive WASM-powered calculator
for the EP01 report page. The WASM brachistochrone bindings already exist in `solar-line-wasm`
(brachistochrone_accel, brachistochrone_dv, brachistochrone_max_distance). This task builds
the browser-side UI: sliders for key parameters and an output table showing computed results.

This fulfills the DESIGN.md goal of interactive reproducibility — readers can adjust parameters
and see how results change in real-time.

## Scope

1. Build a standalone `calculator.js` browser module (or extend existing one) with:
   - Sliders: distance (AU), ship mass (tonnes), transfer time (hours)
   - Output: required acceleration (m/s², g), ΔV (km/s), comparison with Kestrel specs
   - WASM integration via solar-line-wasm bindings
2. Add calculator component rendering to templates.ts (new report type or section)
3. Embed calculator in EP01 report (Mars→Ganymede transfer)
4. Add E2E or unit tests for calculator rendering
5. Update the idea file to mark as DONE

## Dependencies

- solar-line-wasm brachistochrone bindings (DONE)
- EP01 report (DONE)
- Report build pipeline (DONE)
