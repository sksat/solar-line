## Status: DONE

# Task 048: Report UX Polish — Number Formatting, Calculator Feedback, Animation Robustness

## Goal
Polish the interactive report experience with targeted fixes for number display, calculator usability, and animation resource management.

## Scope
1. **Number formatting in scenario tables**: Values ≥1000 switch to exponential notation (e.g. 1202 → "1.20e+03"), which is jarring. Use toLocaleString for values under a high threshold, only switch to exponential for truly large numbers (≥1e6).
2. **Calculator invalid input feedback**: Currently silently returns on invalid input, leaving stale results visible. Show "値が無効です" feedback.
3. **Animation visibility handler**: Pause `requestAnimationFrame` loop when page tab is hidden to save resources.
4. **WASM build verification**: Log warnings when WASM files are missing during build (helps debug deployment issues).

## Dependencies
- templates.ts (scenario table rendering)
- calculator.js (input validation)
- orbital-animation.js (animation loop)
- build.ts (WASM copy step)

## Files to modify
- `ts/src/templates.ts` — scenario table number formatting
- `ts/src/calculator.js` — invalid input feedback
- `ts/src/orbital-animation.js` — visibility change handler
- `ts/src/build.ts` — WASM file verification
- Tests as needed
