# Task 092: Episode-Aware Brachistochrone Calculator

## Status: DONE

## Motivation

The interactive brachistochrone calculator (`calculator.js`) currently has only EP01 presets, but it appears on every episode page. Each episode involves different transfers with distinct distances, transfer times, and conditions. Adding episode-specific presets would let readers explore the parameter space of the episode they're viewing.

## Scope

1. Add per-episode presets to `calculator.js` covering key transfers from each episode
2. Pass the current episode number from the template to the calculator
3. Show the relevant presets for the current episode, with a way to see other episodes' presets
4. Add TS tests for the template changes

## Episode Transfer Summary (for presets)

- **EP01**: Mars→Ganymede 3.68 AU 72h (canonical), 150h route, mass scenarios (48t, 4800t, 48000t)
- **EP02**: Jupiter escape (brachistochrone 27h), Jupiter→Saturn 7.68 AU ballistic 455d (not brachistochrone)
- **EP03**: Enceladus→Titania ~10.6 AU 143h, navigation error 99.8%
- **EP04**: Titania→Earth 18.2 AU 65% thrust, plasmoid shielding
- **EP05**: Uranus→Earth composite route 507h total, nozzle lifespan 55h38m

## Dependencies
- calculator.js (existing)
- templates.ts renderCalculator() + renderEpisodePage()
- report-types.ts (no changes expected)
