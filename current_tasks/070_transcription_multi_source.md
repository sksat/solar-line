# Task 070: 文字起こしページ複数ソース表示

## Status: TODO

## Motivation

Human directive: 「文字起こしのページは、複数のデータソースの生の表示と、文脈から文字や話者を修正したものをそれぞれ選択可能にしたい」

## Scope

- Add tab/selector UI to transcription pages
- Show raw data from each source (YouTube VTT, Whisper, etc.) separately
- Show corrected/attributed version as another tab
- Update TranscriptionPageData type if needed
- Update renderTranscriptionPage in templates.ts
