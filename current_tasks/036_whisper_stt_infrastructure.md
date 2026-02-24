# Task 036: Whisper STT Infrastructure for EP05 Subtitles

## Status: DONE

## Motivation
EP05 (sm45987761) was uploaded to Niconico on 2026-02-23 but has no subtitles available (Niconico subtitles: `{}`). YouTube upload is still pending, so no VTT auto-subs either. This blocks both Task 009 (EP05 dialogue attribution) and Task 023 (EP05 full analysis).

The human directive in `ideas/ocr_speech_to_text.md` calls for building OCR/STT infrastructure as additional subtitle sources. Whisper is the recommended approach for VOICEROID content, which YouTube's ASR handles poorly.

## Progress
- [x] Download EP05 audio from Niconico → raw_data/audio/ep05_sm45987761.wav (298 MB)
- [x] Build Whisper JSON parser (whisper.ts) with quality filtering
- [x] Write 19 tests (whisper.test.ts) — all pass
- [x] Create CLI script (run-whisper.ts, npm run whisper)
- [x] Add "whisper" source type to subtitle-types.ts + dialogue-extraction-types.ts
- [x] Codex review: 5 findings fixed (execFileSync, minAvgLogProb, segment sorting, model default, word_timestamps)
- [x] Run Whisper medium model on EP05 audio (~1.42GB model, ~82 min CPU-only transcription)
- [x] Run dialogue extraction (Phase 1) on Whisper output

## Results
- **Whisper transcription**: 341 segments, 325 reliable (16 filtered by quality thresholds)
- **Quality stats**: avg_logprob -0.212 (excellent), avg_no_speech_prob 0.083 (low), language detected: ja
- **Dialogue extraction**: 164 merged lines from 325 subtitle entries
- **Output files** (in raw_data/whisper/, gitignored):
  - sm45987761_whisper.json (raw Whisper output, 949 KB)
  - sm45987761_subtitle.json (RawSubtitleFile for pipeline)
  - sm45987761_quality.json (quality report)
  - ep05_lines.json (Phase 1 extracted dialogue, 164 lines)
- **Test suite**: 704 tests passing (19 new whisper tests)

## Scope
1. **Download EP05 audio** from Niconico (sm45987761) using yt-dlp
2. **Run OpenAI Whisper** (local, `medium` model) on the audio to generate Japanese transcription with timestamps
3. **Build a Whisper-to-subtitle converter** that outputs the same format as VTT parsing (compatible with existing subtitle pipeline)
4. **Run dialogue extraction** (Phase 1) on Whisper output to produce `ep05_lines.json`
5. **Write tests** for the Whisper subtitle conversion

## EP05 Metadata (from Niconico)
- Title: SOLAR LINE Part5 END（ソーラーライン）【良いソフトウェアトーク劇場】
- Duration: 1631 seconds (27:11)
- Tags: 最終回, 東北きりたん, SF, 宇宙, ソーラーライン
- Description: 小型船貨物船を操るきりたんが，太陽系を駆け抜けます．
- Comments: 827, Likes: 538, Views: 2614
- Upload date: 2026-02-23

## Non-Goals
- Phase 2 dialogue attribution (requires manual review)
- Full EP05 report update (separate follow-up task)
- OCR infrastructure (separate future task)

## Depends on
- Task 004 (subtitle pipeline) — DONE
- Task 009 (dialogue attribution) — IN PROGRESS, blocked on EP05 subtitles
- ideas/ocr_speech_to_text.md (human directive)
