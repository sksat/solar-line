# Task 265: 3D Analysis Epoch Data Sync in Cross-Episode Report

## Status: DONE

## Motivation

Task 264 updated the epoch (2241→2214) and re-ran 3D orbital analysis (`3d_orbital_analysis.json`).
However, the cross-episode report (`cross-episode.md`) 3D section still contains **pre-epoch-change values**:

1. **Saturn ring crossing approach angle**: Report says ~27°, JSON says 9.33°
2. **Uranus approach angles**: Report says ~60°/70°, JSON says 25.3°/14.3°
3. **Z-height bar chart**: Old values (e.g., Mars 6839, Jupiter 17373) vs JSON (Mars 4047, Jupiter -6416)
4. **3D parameter table 面外距離**: Old values (10,534/391/31,928/13,998) vs JSON (10,462/54,052/11,262/36,529)
5. **Prose text**: References to ~27° and ~60° approach angles are stale

## Scope

- Update all numerical values in cross-episode.md 3D section to match 3d_orbital_analysis.json
- Update side-view diagram angles
- Update bar chart values
- Update table values
- Update prose descriptions
- Add article content validation tests to prevent future divergence
- Re-run `npm run analyze-3d` if values seem questionable

## Dependencies

- Task 264 (epoch resolution) — DONE
