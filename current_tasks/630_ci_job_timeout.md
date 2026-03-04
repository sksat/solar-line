# Task 630: Add CI Job Timeout Configuration

Status: DONE

## Problem
CI jobs had no explicit timeout, defaulting to GitHub Actions' 6-hour maximum. A hung job would consume 6 hours of CI minutes before being cancelled.

## Solution
Added `timeout-minutes` to all 5 CI jobs:
- `rust`: 15 min (fmt + clippy + tests)
- `typescript`: 20 min (WASM build + typecheck + 4,200+ tests)
- `e2e`: 30 min (WASM build + site build + Playwright + browser install)
- `cross-validate`: 20 min (Rust export + Python deps + Orekit download + 504 checks)
- `wasm-web`: 10 min (simple WASM build)

## Files Modified
- `.github/workflows/ci.yml` — Added timeout-minutes to all 5 jobs
