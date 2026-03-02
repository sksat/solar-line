# Task 490: Refresh ai-costs.md Stale Project Stats

## Status: DONE

## Summary

The ai-costs.md report had stale project statistics from Task 279 era (353 tasks, 494+ commits, 2,314 TS tests, 378 Rust tests, 242 E2E tests). Updated all values to current:

- Tasks: 353 → 489
- Commits: 494+ → 647+
- TS tests: 2,314 → 3,640
- Rust tests: 378 → 497
- E2E tests: 242 → 256
- Total tests: 2,934 → 4,393

Also replaced brittle hardcoded test assertions with dynamic regex-based checks using minimum thresholds (same pattern as tech-overview.md tests), so these tests won't go stale again.

## Impact

- ai-costs.md now reflects actual project scale
- Test assertions use minimum-threshold pattern (≥400 tasks, ≥500 commits, etc.) instead of exact values
- Consistent with tech-overview.md's dynamic assertion style
