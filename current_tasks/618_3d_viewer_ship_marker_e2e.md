# Task 618: Add E2E Tests for 3D Viewer Ship Marker Visibility

Status: DONE

## Problem
Tasks 615-617 fixed ship marker visibility across 3D scene types (full-route, episode, local encounter). However, there are NO E2E tests verifying the ship marker works correctly in the 3D viewer (orbital-3d.html). The 2D animation has ship marker tests but the 3D viewer doesn't, creating a regression risk.

## Solution
Add Playwright E2E tests that verify:
1. Ship marker label (▲ ケストレル) is visible at t=0 in key scene types
2. Ship marker position changes between t=0% and t=100%
3. Cover all scene categories: full-route, episode, local encounter

## Files to Modify
- `ts/e2e/examples.spec.ts` — Add 3D viewer ship marker tests
