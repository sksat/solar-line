# Task 210: EP03 Captive Identity Investigation

## Status: NOT STARTED

## Priority: HIGH

## Objective
Investigate and correct the identity of the person captured by Earth military in EP03 scene-05. The current dialogue attribution and scene description assume it's きりたん, but the project owner notes this may not be correct contextually.

## Background
EP03 scene-05 (6:20-8:50) contains an interrogation scene where someone is held in a 1G environment by 地球軍. The dialogue includes:
- ケイ: "大丈夫ですか？ 心拍数が増えていますが"
- きりたん(attributed): "大丈夫なわけないだろう。私は火星生まれなんだ。1Gは重すぎる"
- 地球軍関係者: "これが地球です"
- 地球軍関係者: "哀れですね。あなたたち外園居住者は..."
- きりたん(attributed): "趣味が悪いよな、地球人は"

### Key Question
During EP03, きりたん is on the Kestrel traveling from Saturn/Enceladus to Uranus. The scene being set on Earth implies either:
1. A flashback (past event)
2. A different character (another outer-garden resident captured by Earth military)
3. A parallel timeline or intercut scene

### Human Directive
「3話で地球軍に捕まっているのは文脈的にきりたんではなくない？」

## Scope
1. **Re-watch EP03 scene** (6:20-8:50) to determine who is actually in the interrogation scene
2. **Contextual analysis**: Consider narrative flow — what precedes and follows this scene
3. **Voice identification**: The VOICEROID voices may help distinguish characters
4. **Update dialogue attribution** if the speaker is not きりたん
5. **Update scene-05 description** in ep03_dialogue.json
6. **Update ship-kestrel.md** references to "きりたんが1Gに苦しむ描写"
7. **Update cross-episode.md** references to this scene

## Key Files
- `reports/data/episodes/ep03_dialogue.json` (scene-05, lines ep03-dl-028 to ep03-dl-032)
- `reports/data/episodes/ep03.md` (analysis referencing this scene)
- `reports/data/summary/ship-kestrel.md` (耐G仮説 section, lines 295-365)
- `reports/data/summary/cross-episode.md` (G負荷の不可視性 section)
- `reports/data/episodes/ep03_speakers.json` (speaker notes)

## Dependencies
- Requires video access or EP01 script-level data for EP03 to verify
- May affect Task 211 (G-force separation) analysis
