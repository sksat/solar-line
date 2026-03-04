# Task 619: Fix Test Coverage Gaps in 3D Viewer Tests

Status: DONE

## Problem
1. Ship marker E2E tests (Task 618) don't capture JS console errors — missing `collectConsoleErrors` calls
2. EP03/EP04/EP05 episode timeline durations not tested in unit tests (only EP01/EP02 covered)

## Solution
1. Add `collectConsoleErrors` + `expect(errors).toEqual([])` to all ship marker E2E tests
2. Add EP03/EP04/EP05 timeline.totalDays assertions to orbital-3d-viewer-data.test.ts

## Files to Modify
- `ts/e2e/examples.spec.ts` — Add error checking to ship marker tests
- `ts/src/orbital-3d-viewer-data.test.ts` — Add EP03-EP05 timeline duration tests
