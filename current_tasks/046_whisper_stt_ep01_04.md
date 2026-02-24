# Task 046: Whisper STT for Episodes 01-04

## Status: DONE

## Motivation
Task 036 built Whisper STT infrastructure and successfully transcribed EP05 (Niconico-only, no YouTube subtitles). Episodes 01-04 have YouTube auto-generated VTT subtitles, but these are known to be unreliable for VOICEROID/software-talk content.

Running Whisper on EP01-04 provides a second, independent transcription source with higher accuracy.

## Results

### Whisper Quality (small model, CPU)

| EP | Segments | Reliable | Avg LogProb | Whisper Lines | VTT Lines | Whisper Chars | VTT Chars |
|----|----------|----------|-------------|---------------|-----------|---------------|-----------|
| 1  | 440      | 430 (98%)| -0.144      | 419           | 87        | 5,258         | 4,305     |
| 2  | 426      | 415 (97%)| -0.142      | 408           | 80        | 5,056         | 3,874     |
| 3  | 448      | 432 (96%)| -0.145      | 420           | 88        | 4,821         | 4,141     |
| 4  | 162      | 159 (98%)| -0.215      | 159           | 85        | 5,255         | 4,209     |

Key findings:
- Whisper captures 15-30% more text content than YouTube VTT
- Quality is excellent across all episodes (avg_logprob > -0.25, >95% reliable)
- EP04 has fewer, longer segments (dramatic pacing with longer pauses)
- All Whisper output stored in raw_data/whisper/ (gitignored)

### New Scripts
- `process-whisper`: Post-process raw Whisper JSON into subtitle.json + quality.json
- `extract-dialogue-whisper`: Whisper-specific Phase 1 extraction (minimal merging since Whisper segments are already sentence-level)
- `compare-transcriptions`: Quality comparison table (Whisper vs VTT)

### Whisper-Specific Extraction Strategy
Standard VTT extraction uses aggressive merging (no_terminal_punctuation + small_gap → merge) because VTT auto-generated subtitles split mid-sentence. Whisper segments are already semantically complete utterances, so we use minimal merging: only merge fragments (<3 chars) with zero-gap adjacency.

## Files Modified
- `ts/src/extract-dialogue-from-whisper.ts` — NEW: Whisper-specific Phase 1 extraction
- `ts/src/process-whisper-output.ts` — NEW: Post-process raw Whisper JSON
- `ts/src/compare-transcriptions.ts` — NEW: Quality comparison script
- `ts/package.json` — 3 new npm scripts

## Files Created (gitignored, in raw_data/)
- `raw_data/audio/ep01_CQ_OkDjEwRk.wav` through `ep04_1cTmWjYSlTM.wav`
- `raw_data/whisper/{videoId}_whisper.json` — Raw Whisper JSON (4 files)
- `raw_data/whisper/{videoId}_subtitle.json` — RawSubtitleFile (4 files)
- `raw_data/whisper/{videoId}_quality.json` — Quality reports (4 files)
- `raw_data/whisper/ep{01-04}_lines.json` — Phase 1 extracted dialogue (4 files)

## Depends on
- Task 036 (Whisper STT infrastructure) — DONE
- Task 004 (subtitle pipeline) — DONE
- Task 009 (dialogue extraction) — DONE
