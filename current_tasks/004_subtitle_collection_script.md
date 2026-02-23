# Task 004: YouTube Subtitle Collection Script

## Status: DONE

## Goal
TypeScript script to collect YouTube subtitle/caption data for SOLAR LINE episodes. Define input/output JSON schema (timestamps, speaker, language, source URL).

## Details
- Use yt-dlp or YouTube API for subtitle extraction
- Raw data gitignored; only processed/attributed data committed
- Schema defined first (TDD approach)

## Depends on
- Task 001 (TS project setup)

## Completed Work
- **subtitle-types.ts**: Two-tier data model (Codex-reviewed)
  - Raw: `RawSubtitleEntry`, `RawSubtitleFile` (gitignored, fetched via yt-dlp)
  - Attributed: `DialogueLine`, `SceneBreak`, `EpisodeDialogue` (committed, human/AI reviewed)
  - Speaker registry with canonical IDs and aliases
  - OrbitalMention annotations for linking dialogue to TransferAnalysis
  - Provenance: schema version, content hash, review metadata
  - Integer milliseconds for all timestamps (Codex recommendation)
- **subtitle.ts**: VTT/SRT parsers, validators, builder utilities
- **collect-subtitles.ts**: CLI wrapper for yt-dlp (requires yt-dlp in PATH)
- **subtitle.test.ts**: 25 tests covering parsing, validation, building
- All 137 tests passing (92 TS + 45 Rust), typecheck clean
