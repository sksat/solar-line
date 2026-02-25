# Task 170: Scene Timeline (Timestamp → Maneuver → Verdict)

Status: TODO

## Goal
Add a compact visual timeline per episode mapping video timestamps to maneuvers and plausibility verdicts. Helps readers quickly see "what happens when" and "was it plausible?"

## Background
Codex consultation suggestion: "A scene timeline: episode timestamp → maneuver → plausibility verdict."

## Approach
- New report section type or component showing a horizontal/vertical timeline
- Each point: timestamp (clickable to video), maneuver name, verdict badge
- Data already exists in transfers (timestamps, verdicts)
- Could be auto-generated from existing transfer data
