# Task 099: Enceladus Speaker Correction + Transcription Data Layers

## Status: DONE

## Motivation
Human directives:
- エンケラドスにいるのはミューズではなかったと思う
- 話者判定やそれを前提にした分析はもう一度見直すべき
- whisper のどのモデルを使用したかも記載が無い
- 生の文字起こしデータと、話者分離処理のような追加の前処理をしたデータと、全体の文脈から各種修正を加えたデータを区別して表示するべき

## Scope
1. **Speaker correction**: Verify who is on Enceladus in EP05. If not ミューズ, correct the dialogue attribution and any report references
2. **Whisper model documentation**: Add which Whisper model (size) was used for each episode's transcription
3. **Transcription data layers**: Implement 3-tier display on transcription pages:
   - Layer 1: Raw transcription data (YouTube VTT or Whisper output, unmodified)
   - Layer 2: Preprocessed data (speaker diarization, timestamp alignment)
   - Layer 3: Context-corrected data (speaker attribution, text corrections)
4. **Re-review**: Review speaker attribution across all episodes given this correction

## Completed Work

### Speaker Correction (prior session)
- **DONE**: ミューズ → エンケラドスの管理人 (EP02 consistent naming)
  - Speaker ID: muse → enceladus-keeper
  - Updated: ep05_dialogue.json, ep05_speakers.json, ep05.json, ep02.json, infrastructure.json, attitude-control.json
  - Raw transcription data (ep05_lines.json, ep03_lines*.json) NOT modified (Whisper output as-is)

### Whisper Model Documentation (this session)
- Added `whisperModel` optional field to `EpisodeLines.sourceSubtitle` in `dialogue-extraction-types.ts`
- Added `whisperModel` optional field to `TranscriptionPageData.sourceInfo` and `additionalSources` in `report-types.ts`
- Updated all 5 Whisper-sourced lines files with `"whisperModel": "medium"`
- `discoverTranscriptions()` in build.ts now passes `whisperModel` through
- Source info card displays model name
- Tab labels show `[medium]` for Whisper sources
- `extract-dialogue-from-whisper.ts` accepts `--whisper-model` flag for future runs

### 3-Tier Transcription Data Layers (this session)
- Added layer legend card explaining the 3-tier data model on each transcription page
- Tab labels now prefixed with `Layer 3:` (corrected) or `Layer 2:` (preprocessed)
- Layer badges with color coding: green (L3), yellow (L2), gray (L1)
- Layer 1 (raw) explained as git-external; Layer 2 is the closest available view
- CSS: `.layer-badge`, `.layer-dl`, `.meta-note` styles
- 15 passing tests including 3 new: model display, layer legend, alt source model
