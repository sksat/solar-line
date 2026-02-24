# Task 056: Speaker Diarization Investigation

## Status: TODO

## Motivation
Human directive: 話者分離の技術を用いるとより精度が高まるかもしれない。

## Scope
1. Research speaker diarization tools (pyannote-audio, NeMo, etc.)
2. Test on EP01 audio to evaluate VOICEROID voice separation quality
3. If viable, integrate into dialogue pipeline to aid Phase 2 attribution
4. Track model conditions in subtitle metadata

## Notes
- VOICEROID voices are synthetic — may cluster well or poorly depending on tool
- Even imperfect diarization helps reduce manual Phase 2 work
