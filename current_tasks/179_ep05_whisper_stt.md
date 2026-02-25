# Task 179: Generate EP05 Whisper STT for multi-source comparison

## Status: TODO

## Description
EP01-04 all have Whisper STT outputs (`epXX_lines_whisper.json`), but EP05 only has VTT (`ep05_lines_vtt.json`).
Generate `ep05_lines_whisper.json` to achieve infrastructure parity across all episodes.

## Prerequisites
- EP05 video downloaded to `raw_data/` (gitignored)
- Whisper installed (or available via API)

## Steps
1. Download EP05 audio from YouTube (`_trGXYRF8-4`) or Niconico (`sm45987761`)
2. Run Whisper STT (medium or large model for Japanese)
3. Generate `ep05_lines_whisper.json` using existing pipeline (`ts/src/whisper-processor.ts`)
4. Add transcription page Layer 2 Whisper tab
5. Update DAG if needed

## Notes
- Refer to Task 056 for Whisper processing methodology
- Record model size and settings in metadata (per CLAUDE.md Whisper model tracking directive)
- VOICEROID accuracy may be limited (see `ideas/voiceroid_asr_quality.md`)
