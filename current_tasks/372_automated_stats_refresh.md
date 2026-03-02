# Task 372: Automated Stats Refresh Script

## Status: DONE

## Motivation

The tech-overview.md report contains statistics (test counts, task counts, total counts) that must be manually synchronized whenever tests are added or tasks are completed. This has been a **recurring pain point** — 27 separate "stats refresh" tasks have been created just to update these numbers. Each time a new task adds tests, the stats go stale and tests fail.

## Implementation

Created `npm run stats-refresh` that automatically:
1. Runs `npm test` and extracts TS test count from output
2. Runs `cargo test --workspace` and sums Rust test counts
3. Runs `npx playwright test --list` to count E2E tests
4. Runs `bash cross_validation/run.sh` and counts [PASS]/✓/OK lines (all formats)
5. Counts `.md` files in `current_tasks/`
6. Runs `git rev-list --count HEAD` for commit count
7. Updates **both** the stats table AND body text in `tech-overview.md`

Supports `--dry-run` flag to preview changes without writing.

## Files
- `ts/src/stats-refresh.ts` — main script with `collectStats()`, `updateStatsTable()`, `updateBodyText()`
- `ts/src/stats-refresh.test.ts` — 14 TDD tests (formatNumber, updateStatsTable, updateBodyText)
- `ts/package.json` — added `stats-refresh` script entry

## Results
- 14 new tests, all passing
- Total TS tests: 2,476 (was 2,462)
- Tech-overview.md automatically updated to: 3,117 total tests, 372 tasks, 513+ commits
- Future sessions can run `npm run stats-refresh` instead of creating a new stats refresh task
