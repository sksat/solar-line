# Task 099: Enceladus Speaker Correction + Transcription Data Layers

## Status: IN_PROGRESS (speaker correction done, transcription layers TODO)

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

## Notes
- The existing multi-source tab UI (Task 070) already shows corrected vs VTT vs Whisper
- This extends that to show processing stages within each source
- ~~EP05 dialogue says ミューズ on Enceladus — need to verify against video content~~
- **DONE**: ミューズ → エンケラドスの管理人 (EP02 consistent naming)
  - Speaker ID: muse → enceladus-keeper
  - Updated: ep05_dialogue.json, ep05_speakers.json, ep05.json, ep02.json, infrastructure.json, attitude-control.json
  - Raw transcription data (ep05_lines.json, ep03_lines*.json) NOT modified (Whisper output as-is)
- Remaining: Whisper model documentation + transcription data layers display
