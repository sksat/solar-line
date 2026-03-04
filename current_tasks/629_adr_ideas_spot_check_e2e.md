# Task 629: Individual ADR/Ideas Page Spot-Check E2E Tests

Status: DONE

## Problem
Only ADR-001 and one idea page (cost_efficiency_analysis) have individual E2E rendering tests. The other 14 ADR pages and 12 idea pages have no rendering verification.

## Solution
Added parametrized spot-check tests for a sample of ADR pages (005, 010, 015) and idea pages (cross_episode_consistency, ep01_mass_ambiguity, orbital_transfer_diagrams). Each verifies: no JS errors, h1 visible, nav visible, substantive content (>200 chars), expected content markers.

## Files Modified
- `ts/e2e/reports.spec.ts` — Added 6 new parametrized tests (3 ADR + 3 Ideas)
