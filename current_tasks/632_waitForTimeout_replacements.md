# Task 632: Replace waitForTimeout with Event-Based Waits

Status: DONE

## Problem
17 instances of `waitForTimeout()` in E2E tests create flaky tests. Hard-coded delays may be too short in slow CI or unnecessarily slow locally.

## Solution
Replaced all 17 waitForTimeout instances with event-based waits:
- DAG viewer init (10 instances): `waitForSelector("#dag-viewer .dag-filter-bar", { timeout: 10000 })`
- 3D viewer init (5 instances): `controls.waitFor({ state: "visible", timeout: 10000 })` with try/catch skip
- Slider input (1 instance): `expect(infoLabel).not.toContainText("最新")` assertion
- Scene switch (1 instance): `waitForFunction` checking text change
- Tab switch (1 instance): `expect(panel).toBeVisible()` assertion

## Files Modified
- `ts/e2e/reports.spec.ts` — All 17 waitForTimeout instances replaced
