# VOICEROID ASR Quality Issue

## Status: RESOLVED

Mitigations implemented:
- Whisper medium (Task 009) + large-v3-turbo (Task 285): EP01 accuracy 82.6% → 91.4%
- Speaker diarization investigated (Task 056): general-purpose diarization not viable for VOICEROID (80.3% accuracy)
- Multi-source comparison infrastructure (Tasks 297, 298): accuracy + agreement charts on transcription pages
- OCR pipeline (Task 289): captures on-screen text as additional source

## Problem
YouTube's auto-generated subtitles for SOLAR LINE have very poor accuracy.
The series uses VOICEROID/software-talk voices (CeVIO, VOICEVOX, etc.) which
are synthetic speech not well-handled by YouTube's speech recognition.

## Observed Issues (Episode 1: CQ_OkDjEwRk)
- Technical terms garbled: 航案→公案, 軌道→起動, コース→コ路
- Character names lost: Speaker names not recognized at all
- Punctuation unreliable: Sentence boundaries often wrong
- Numbers/units: Generally OK (72時間, 150時間, 47% preserved)
- Long utterances: Often merged/split at wrong boundaries

## Impact on Pipeline
- Phase 1 (extraction): Works mechanically, but text quality is low
- Phase 2 (attribution): Must rely on CONTEXT, not ASR text
  - Speaker detection by voice is impossible from ASR alone
  - Must use dialogue patterns (AI=polite/technical, きりたん=casual/decisions)
- Quote accuracy: Dialogue quotes in reports should be manually verified against video

## Possible Mitigations
1. **Manual transcription**: Most accurate but labor-intensive
2. **Whisper ASR**: Run OpenAI Whisper locally on audio — may handle synthetic speech better
3. **Video OCR**: Some series display text/subtitles on screen that could be extracted
4. **Human correction pass**: Use ASR as starting point, correct against video
5. **Multiple ASR engines**: Cross-reference YouTube auto-subs with Whisper output

## Speaker Diarization Investigation (Task 056)

Tested speaker diarization tools on VOICEROID content:
- **Resemblyzer embeddings**: きりたん-ケイ cosine similarity 0.983 (near-identical)
- **Pitch analysis**: F0 difference only 28.8 Hz with ~100 Hz std overlap
- **Best accuracy**: 80.3% binary (embedding nearest-centroid), insufficient for production use
- **Conclusion**: General-purpose speaker diarization is NOT viable for VOICEROID content
- Non-VOICEROID speakers (管制, 船乗り) have distinct pitch and ARE separable

## Recommendation
For now, use YouTube auto-subs as structural scaffolding (timing, line breaks)
but treat the text content as unreliable. Speaker attribution and quote
correction should be done by reviewing the actual video content.
