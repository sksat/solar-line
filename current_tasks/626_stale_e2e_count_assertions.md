# Task 626: Fix Stale Hardcoded Count Assertions in E2E Tests

Status: DONE

## Problem
Several E2E tests use exact hardcoded counts (e.g., `toBe(15)` for ADR rows, `toBe(13)` for ideas rows) that will break as soon as content is added. These are maintenance traps that cause false test failures unrelated to actual bugs.

## Solution
Replace fragile exact-count assertions with threshold-based assertions (`toBeGreaterThanOrEqual`) where the exact count is not semantically meaningful. Keep exact counts only where they validate specific structural invariants (like 5 episode tabs).

## Files to Modify
- `ts/e2e/reports.spec.ts` — Update ADR, ideas, and DAG count assertions
