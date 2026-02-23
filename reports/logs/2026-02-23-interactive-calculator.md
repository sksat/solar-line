# Session: Interactive Brachistochrone Calculator (Task 007)

## What was done

Added an interactive brachistochrone calculator to the Episode 1 report page, allowing users to explore how distance, ship mass, and transfer time affect the plausibility of depicted transfers.

### Rust core (solar-line-core)
- Added 3 functions to `orbits.rs`: `brachistochrone_accel`, `brachistochrone_dv`, `brachistochrone_max_distance`
- 4 new tests verifying formulas and round-trip consistency

### WASM bridge (solar-line-wasm)
- Exported all 3 brachistochrone functions with flat f64 API
- 3 new tests

### Browser calculator (calculator.js)
- WASM-first with JS fallback (per Codex recommendation)
- Three sliders: distance (AU), ship mass (tonnes), transfer time (hours)
- Four presets: Episode 1 canonical, normal route (150h), mass = 48t, mass = 4,800t
- Output table comparing required vs. ship capability
- Verdict badge (within spec / marginal / Nx shortfall)
- Engine badge showing WASM or JS fallback status

### Template updates
- New `renderCalculator()` function generating the calculator HTML
- Calculator CSS for controls, presets, results table
- Calculator embedded in all episode report pages

### Build pipeline fixes
- Fixed WASM copy path to find `ts/pkg` correctly (Codex-identified bug)
- Added calculator.js copy step

### Test results
- 52 Rust tests (41 core + 11 WASM), all passing
- 134 TypeScript tests (up from 105), all passing
- Total: 186 tests

## Codex consultation
Consulted Codex on 3 design questions:
1. WASM vs inline JS → Use both (WASM-first + JS fallback) ✓
2. UI approach → Sliders + presets + verdict badge ✓
3. JS placement → Option B (separate file), not inline ✓
4. Bonus: Fixed WASM copy path bug identified by Codex
