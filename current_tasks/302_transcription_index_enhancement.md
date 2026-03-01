# Task 302: Transcription Index Page Enhancement — Accuracy/Agreement Summary

## Status: DONE

## Description
Enhanced the transcription index page (`/transcriptions/index.html`) with summary accuracy and inter-source agreement statistics. Previously, readers had to click into each episode's transcription page to see this data.

## Changes
1. Added "精度" (accuracy) column — shows best-source corpus accuracy (EP01: 91.4% from Whisper turbo)
2. Added "ソース間一致" (agreement) column — shows average pairwise agreement across all sources
3. Color-coded badges: green (≥80%), yellow (60-80%), red (<60%)
4. Legend card explaining the metrics and color coding
5. Columns only appear when at least one episode has the corresponding data
6. Resolved stale idea files: ocr_speech_to_text.md, voiceroid_asr_quality.md

## Tests
- +4 TS unit tests for renderTranscriptionIndex (accuracy/agreement display)
- +1 E2E test for transcription index accuracy columns
- All 2225 TS tests pass, 223 E2E tests pass
