# Task 067: ケイ表記統一 & ライ検証

## Status: IN_PROGRESS

## Motivation

Human directives:
- 「ケイは物語的に人間として描写されているのでケイと表記したい」
- 「ライなんて人いたっけ」

## Scope

### ケイ表記
- Rename "ケストレルAI" / "ケストレルAI（ケイ）" to "ケイ" as primary display name
- Speaker ID remains `kestrel-ai` for data consistency
- Update all speaker JSON files, dialogue JSON, episode reports, summary reports
- Update CLAUDE.md reference from "ケストレルAI（ケイ）" to "ケイ"

### ライ検証
- Verify character "ライ" exists in the original source material
- If incorrect, determine correct name and fix across all data files
- If correct but obscure, add clarifying notes

## Files to Update
- `reports/data/episodes/ep*_speakers.json` (nameJa field)
- `reports/data/episodes/ep*_dialogue.json` (speakerName fields)
- `reports/data/episodes/ep*.json` (dialogue quotes)
- `reports/data/summary/*.json` (any ケストレルAI references)
- `CLAUDE.md` (character reference)
