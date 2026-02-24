# Task 089: Dialogue Speaker Attribution Re-review

## Status: TODO

## Motivation

Human directive: 文字起こしの話者なども全体の文脈も踏まえながら再度見直すこと

## Scope

Re-review all 5 episodes' Phase 2 speaker attribution with full cross-episode context:
- EP01: 86 entries, 6 speakers, 8 scenes
- EP02: 102 entries, 4 speakers, 9 scenes
- EP03: 53 entries, 4 speakers, 10 scenes
- EP04: 34 entries, 5 speakers, 10 scenes
- EP05: 113 entries, 5 speakers, 13 scenes

### Review approach
1. Read all 5 episodes' dialogue sequentially to build full character context
2. Check speaker assignments against:
   - Voice characteristics (きりたん=ぞんざい語, ケイ=丁寧語, etc.)
   - Scene context and character knowledge
   - Cross-episode consistency (same character should speak consistently)
3. Correct any misattributions
4. Flag remaining uncertain entries for manual review
5. Update reports if any corrections change cited dialogue

## Dependencies
- Tasks 028, 029 (Phase 2 attribution — DONE)
- Task 079 (transcription-report sync guideline — DONE)
