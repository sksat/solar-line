# Task 067: ケイ表記統一 & ライ検証

## Status: DONE

## Motivation

Human directives:
- 「ケイは物語的に人間として描写されているのでケイと表記したい」
- 「ライなんて人いたっけ」

## Completed

### ケイ表記
- Renamed "ケストレルAI" / "ケストレルAI（ケイ）" → "ケイ" across all 15 JSON files
- Speaker ID remains `kestrel-ai` for data consistency
- Updated CLAUDE.md reference

### ライ → 船乗り
- "ライ" name was fabricated during Phase 2 dialogue attribution (not in raw VTT/Whisper)
- Character exists in ep01 (~9:09, information about pursuing ships) and ep05 (Ganymede control)
- Renamed to "船乗り" (unnamed sailor) as descriptive placeholder
- Added notes documenting the name is unverified

## Files Updated
- `reports/data/episodes/ep*_speakers.json`
- `reports/data/episodes/ep*_dialogue.json`
- `reports/data/episodes/ep*.json`
- `CLAUDE.md`
