# VOICEROID ASR Quality Issue

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

## Recommendation
For now, use YouTube auto-subs as structural scaffolding (timing, line breaks)
but treat the text content as unreliable. Speaker attribution and quote
correction should be done by reviewing the actual video content.
