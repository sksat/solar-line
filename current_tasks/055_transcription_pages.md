# Task 055: Transcription Data on GitHub Pages

## Status: DONE

## Motivation
Human directive: 字幕抽出・文字起こしデータは Pages で見られるようにしたい。

## Scope
1. Add transcription browsing pages to the site
2. Per-episode transcription page showing:
   - Whisper output with timestamps + confidence
   - YouTube VTT comparison (where available)
   - Speaker attribution status
   - Source metadata (model, language, thresholds)
3. Add navigation links from episode pages
4. Include model/condition metadata display

## Implementation (2026-02-24)
- `TranscriptionPageData` type in report-types.ts (assembles lines/dialogue/speakers)
- `discoverTranscriptions()` in build.ts reads ep*_lines.json + ep*_dialogue.json + ep*_speakers.json
- `renderTranscriptionPage()` and `renderTranscriptionIndex()` in templates.ts
- Phase 1 (lines only): timestamp + text + merge reason table
- Phase 2 (attributed): dialogue grouped by scene, speaker names, confidence badges
- Navigation: "文字起こし" link in nav bar + section on index page
- 18 new tests (946 total TS tests, 0 failures)
- All 5 episodes with transcription pages generated

## Depends on
- Task 036 (Whisper infrastructure) — DONE
- Task 046 (Whisper EP01-04) — DONE
