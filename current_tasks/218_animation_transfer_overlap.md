# Task 218: Animation Transfer Overlap Validation & Fix

**Status:** DONE
**Human directive:** Phase 21, item 25

## Problem

EP01 diagram-04 (ペリジュピター捕獲 IF分析) has two transfers in the same scenario ("perijove") with overlapping time windows:
- Transfer 1 (approach→periapsis): `[0, 72000]`
- Transfer 2 (periapsis→Ganymede): `[36000, 72000]`

This causes two ship markers to animate simultaneously during t=36000–72000s. Transfer 1's endTime should be 36000, not 72000.

The human wants a **systematic fix** — not just a data patch, but TDD-based validation to prevent this across all analyses.

## Plan

### Phase 1: Build-time validation (TDD)
1. Add validation in `templates.ts` or a dedicated validator: same-scenario transfers must not have overlapping `[startTime, endTime]` windows
2. Write unit tests first, then implement
3. Validation should run during build (fail fast)

### Phase 2: Fix EP01 diagram-04 data
1. Fix Transfer 1 endTime from 72000 → 36000 in ep01.md
2. Verify other diagrams don't have this issue (scan all episode MDX files)

### Phase 3: E2E test
1. Add Playwright test that verifies no diagram has overlapping same-scenario transfers
2. Or verify via build-time validation + existing test coverage

## Files
- `ts/src/templates.ts` — rendering + validation
- `ts/src/templates.test.ts` — unit tests
- `reports/data/episodes/ep01.md` — buggy data
- `ts/src/orbital-animation.js` — browser hydration
