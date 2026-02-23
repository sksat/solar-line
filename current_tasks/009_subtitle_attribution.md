# Task 009: Subtitle Collection & Speaker Attribution

## Status: IN PROGRESS

## Progress
- [x] Architecture design (two-phase pipeline, Codex-reviewed)
- [x] Phase 1 types: `dialogue-extraction-types.ts` (ExtractedLine, EpisodeLines, MergeConfig)
- [x] Phase 1 logic: `dialogue-extraction.ts` (shouldMergeCues, mergeCueTexts, extractLines, validateEpisodeLines)
- [x] Phase 1 tests: 25 tests, all passing
- [x] Phase 1 CLI: `extract-dialogue.ts` (npm run extract-dialogue)
- [x] Subtitle collection: Downloaded ja-orig and ja tracks for Episode 1 (CQ_OkDjEwRk)
- [x] Extraction run: 478 raw cues → 239 filtered → 87 dialogue lines → ep01_lines.json
- [x] Speaker registry: ep01_speakers.json (6 speakers identified)
- [x] Partial attribution: ep01_dialogue.json (first ~20 lines attributed, ~67 remaining)
- [ ] Complete attribution for all 87 lines
- [ ] Update ep01.json dialogueQuotes from attributed data
- [ ] Cross-reference with transfer analysis

## Key Finding: VOICEROID ASR Quality
YouTube auto-generated subtitles have very poor accuracy for VOICEROID/software-talk content.
Many terms are misrecognized. Speaker attribution must rely on context, not ASR text.
See `ideas/voiceroid_asr_quality.md`.

## Task 028 Progress (EP02-04)
Task 028 completed Phase 2 attribution for EP02, EP03, and EP04:
- EP02: ep02_speakers.json (4 speakers) + ep02_dialogue.json (102 entries, 9 scenes)
- EP03: ep03_speakers.json (4 speakers) + ep03_dialogue.json (53 entries, 10 scenes)
- EP04: ep04_speakers.json (5 speakers) + ep04_dialogue.json (34 entries, 10 scenes)

## Next Session TODO
1. ~~Continue speaker attribution for lines 20-87 in ep01_dialogue.json~~ DONE (Task 029)
2. ~~Update ep01.json dialogueQuotes with corrected, attributed quotes~~ DONE (Task 029)
3. Verify EP01 dialogue text against actual video content (ASR corrections need visual confirmation)
4. Consider alternate subtitle sources (manual transcription?)
5. EP05 dialogue: blocked until YouTube subtitle availability

## Architecture
- Phase 1 (Extraction): `epXX_lines.json` — automated, raw text+timing
- Phase 2 (Attribution): `epXX_dialogue.json` — context-assisted speaker assignment
- Speaker registry: `epXX_speakers.json` — character definitions
- Files are separate so re-running extraction doesn't lose attribution

## Depends on
- Task 004 (subtitle collection pipeline)
