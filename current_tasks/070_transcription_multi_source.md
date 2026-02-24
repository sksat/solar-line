# Task 070: 文字起こしページ複数ソース表示

## Status: DONE

## Motivation

Human directive: 「文字起こしのページは、複数のデータソースの生の表示と、文脈から文字や話者を修正したものをそれぞれ選択可能にしたい」

## Completed

- Added `additionalSources` field to `TranscriptionPageData` type
- Updated `discoverTranscriptions()` to find `epXX_lines_*.json` alternative source files
- Copied Whisper lines data to `reports/data/episodes/ep01-04_lines_whisper.json`
- Implemented tab UI with up to 3 views:
  - 修正版（話者帰属済み）: Phase 2 corrected dialogue with speakers
  - YouTube 自動字幕（生データ）: Raw YouTube VTT extraction
  - Whisper STT（生データ）: Raw Whisper STT extraction
- Tab switching via lightweight inline JavaScript
- Single-source pages render without tabs
- Source info card shows all available sources with line counts
- Transcription index shows multi-source counts
- 4 new tests (tab UI rendering, single tab, two tabs, source card)
- All 965 TS tests pass, typecheck clean
