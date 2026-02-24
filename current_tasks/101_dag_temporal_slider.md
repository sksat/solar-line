# Task 101: DAG Historical Temporal Slider

## Status: TODO

## Motivation
Human directive: DAG の過去への遡りは時間的なスライダーで操作したい

## Scope
1. Add a time slider to the DAG viewer that allows scrubbing through historical snapshots
2. Use the existing historical snapshot data (dag/log/snapshots/)
3. Animate transitions between DAG states as the slider moves
4. Show timestamp/commit info for each snapshot position

## Notes
- DAG viewer already has historical snapshot selector (Task 088)
- This changes from dropdown selection to continuous slider UX
- Snapshots are stored as timestamped JSON files
