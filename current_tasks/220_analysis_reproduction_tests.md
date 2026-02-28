# Task 220: Analysis Reproduction Test Framework

**Status:** CLAIMED (future task)
**Human directive:** Phase 21 addendum, item 26

## Problem

Currently, per-episode analysis reproduction commands exist (`npm run recalculate`) but they are batch processes, not individually testable. The human wants:
1. A test tool where each episode `.md` file can be specified to run its analysis as a "test"
2. Shared parameters (ship specs, constants) in separate files for reuse
3. CI automatically runs all analysis tests for consistency
4. When preconditions (parameters) change, re-running tests ensures integrity

## Plan

### Phase 1: Extract shared parameters
- Identify shared parameters across episodes (ship specs, physical constants, celestial body data)
- Create `reports/data/parameters/` directory with shared parameter files
- Episode MDX files reference these shared parameters

### Phase 2: Per-episode analysis test runner
- Create `npm run test:analysis` command
- Accept optional `--episode ep01` argument to run a single episode
- Each episode's analysis is validated as a test (assertions on expected results)
- Output comparison: re-derive calculated values and compare with stored results

### Phase 3: CI integration
- Add analysis test step to GitHub Actions CI
- Run all episode analysis tests on every push
- Fail CI if any analysis produces different results than stored

## Files
- `ts/src/analysis-test-runner.ts` — new test runner
- `reports/data/parameters/` — shared parameter files
- `.github/workflows/ci.yml` — CI integration
