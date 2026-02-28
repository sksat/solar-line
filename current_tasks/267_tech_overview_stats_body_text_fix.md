# Task 267: Fix stale test counts in tech-overview body text

## Status: DONE

## Problem
The tech-overview.md summary table (line 24) has correct test counts (2,635 = TS 2,044 + Rust 377 + E2E 214), but the body text paragraphs are stale:
- Line 184: "2,353のテスト" → should be 2,635
- Line 189: "TypeScript ユニットテスト (1,922件)" → should be 2,044
- Line 190: "Playwright E2E テスト (139件)" → should be 214

## Solution
1. Fix the stale numbers in the body text
2. Add article content validation tests to prevent future drift between the summary table and body text

## Acceptance Criteria
- [ ] Body text matches summary table
- [ ] Article content validation tests check consistency
- [ ] All tests pass
