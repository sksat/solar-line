# Task 550: Fix CI failures (human directive #28)

## Status: DONE

## Summary

Human directive: "CI がコケ続けていてデプロイがずっと失敗している"

### Root causes identified and fixed:
1. **cargo fmt** — 9 Rust files had formatting issues (accumulated from Tasks 546-549)
   - Fixed with `cargo fmt --all`

2. **TypeScript typecheck** — Two null-safety errors in article-content-validation.test.ts
   - `analysis.arrivalConsistency.progradeOnly` possibly null
   - `analysis.trimThrust.primary` possibly undefined
   - Fixed by adding assert.ok() guards before accessing

3. **poliastro pip install** — astropy failed to compile from source in CI (Python 3.11)
   - Root cause: Task 456 added `poliastro` to CI pip install, but Ubuntu CI lacked C compiler headers for astropy
   - Fixed by using `--only-binary ':all:'` flag to force pre-built wheels
   - Also upgraded pip first and used multi-line YAML block for compatibility

### Impact
- CI went from all-red (since commit a813917, ~48 commits ago) to all-green
- Deploy to GitHub Pages resumed after being blocked for ~1 day
- All 5 CI jobs pass: Rust, TS, E2E, Cross-validate, WASM build
