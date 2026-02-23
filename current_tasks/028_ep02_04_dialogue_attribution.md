# Task 028: Episode 2-4 Dialogue Attribution (Phase 2)

## Status: DONE

## Objective
Create speaker registries and dialogue files for episodes 2-4, advancing Phase 2 of the dialogue pipeline. Phase 1 (extraction) is already done for these episodes.

## Episode Data
- EP02: 80 extracted lines in `ep02_lines.json`, report in `ep02.json`
- EP03: 88 extracted lines in `ep03_lines.json`, report in `ep03.json`
- EP04: 85 extracted lines in `ep04_lines.json`, report in `ep04.json`

## Approach
- Use episode report data (dialogue quotes, transfer analysis) as context for speaker identification
- Create speaker registries (`epXX_speakers.json`) based on characters known from each episode
- Create dialogue files (`epXX_dialogue.json`) with scene-based speaker attribution
- Mark uncertain attributions with `confidence: "uncertain"`
- ASR text corrections based on context when meaning is clear

## Progress
- [x] EP02 speakers registry and dialogue attribution
  - 4 speakers: kiritan, kestrel-ai, enceladus-keeper, unknown-vessel
  - 9 scenes, ~102 attributed dialogue entries covering all 80 lines
- [x] EP03 speakers registry and dialogue attribution
  - 4 speakers: kiritan, kestrel-ai, earth-officer, guest
  - 10 scenes, ~53 key attributed entries
- [x] EP04 speakers registry and dialogue attribution
  - 5 speakers: kiritan, kestrel-ai, guest, titania-control, fleet-officer
  - 10 scenes, ~34 key attributed entries
- [x] Update task 009 notes

## Depends on
- Task 009 (subtitle attribution — Phase 1 complete)
- Task 008 (EP02 analysis)
- Task 015 (EP03 analysis)
- Task 020 (EP04 analysis)
