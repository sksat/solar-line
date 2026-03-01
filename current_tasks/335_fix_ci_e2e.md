# Task 335: Fix CI Playwright E2E Failures

## Status: DONE

## Description
CI Playwright E2E tests have been failing since Task 261 (propagation demo addition). The E2E job in ci.yml doesn't build WASM, but the propagation demo and data explorer require WASM for full functionality. While tests pass locally (even without WASM), CI fails consistently.

## Root Cause Analysis
The E2E job in ci.yml lacks WASM build step, unlike the Pages workflow. Some browser-side code may throw JS errors when WASM is unavailable, causing E2E tests that check for "no JS errors" to fail.

## Fix
Add WASM build step to the E2E job in ci.yml, mirroring the Pages workflow.

## Deliverables
- Updated ci.yml with WASM build in E2E job
- CI passes after push
