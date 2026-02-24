# Task 036: Whisper STT Infrastructure for EP05 Subtitles

## Status: IN PROGRESS

## Motivation
EP05 (sm45987761) was uploaded to Niconico on 2026-02-23 but has no subtitles available (Niconico subtitles: `{}`). YouTube upload is still pending, so no VTT auto-subs either. This blocks both Task 009 (EP05 dialogue attribution) and Task 023 (EP05 full analysis).

The human directive in `ideas/ocr_speech_to_text.md` calls for building OCR/STT infrastructure as additional subtitle sources. Whisper is the recommended approach for VOICEROID content, which YouTube's ASR handles poorly.

## Scope
1. **Download EP05 audio** from Niconico (sm45987761) using yt-dlp
2. **Run OpenAI Whisper** (local, `large` model) on the audio to generate Japanese transcription with timestamps
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
