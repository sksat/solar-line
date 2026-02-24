# Task 101: DAG Historical Temporal Slider

## Status: DONE

## Motivation
Human directive: DAG の過去への遡りは時間的なスライダーで操作したい

## Scope
1. Add a time slider to the DAG viewer that allows scrubbing through historical snapshots
2. Use the existing historical snapshot data (dag/log/snapshots/)
3. Animate transitions between DAG states as the slider moves
4. Show timestamp/commit info for each snapshot position

## Result
- Replaced `<select>` dropdown with `<input type="range">` temporal slider
- Slider positions: 0 (oldest snapshot) to N (current state = "最新")
- Info label shows timestamp + node/edge count for selected snapshot
- Debounced fetch (150ms) for smooth scrubbing
- Snapshot cache to avoid re-fetching previously loaded states
- CSS: `.dag-slider-wrap`, `.dag-temporal-slider`, `.dag-slider-info`
- 4 Playwright E2E tests verify slider presence, label updates, and range

## Notes
- DAG viewer already has historical snapshot selector (Task 088)
- This changes from dropdown selection to continuous slider UX
- Snapshots are stored as timestamped JSON files
