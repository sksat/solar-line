# Task 210: EP03 Captive Identity Investigation

## Status: DONE

## Priority: HIGH

## Objective
Investigate and correct the identity of the person captured in EP03 scene-05. The dialogue attribution and scene description incorrectly assumed it was きりたん held by 地球軍 on Earth.

## Findings (Video Frame Analysis)

### Scene Location
**保安艇「エシュロン」艦内 / 軌道港湾機構 / 土星低軌道停泊軌道**
- NOT Earth — Saturn low orbit
- NOT 地球軍 — 国際連合・軌道港湾機構 (United Nations Orbital Port Authority)
- Location confirmed via on-screen telop at 6:27

### Characters Identified

1. **リア・オルフェウス (Lia Orpheus)** — the captive
   - Mars-born (火星自治連邦の公民権), navigation license holder (火星港湾公社発行)
   - Dark blue hair, dark clothes with green accents
   - Restrained in 1G gravity section of the Echelon
   - Named explicitly by セイラ at ~7:10: "あなたはリア・オルフェウス…"

2. **ミューズ (Muse)** — リア's ship AI
   - Short dark/purple hair, purple eyes, white outfit with dark tie
   - Monitors リア's vitals ("大丈夫ですか？心拍数が増えていますが")
   - Named by セイラ at ~8:55: "ではミューズ…"
   - リア comments "地球じゃAIには名前付けないんじゃないのか" — paralleling きりたん/ケイ relationship

3. **セイラ・アンダース (Seira Anders)** — UN Port Authority commissioner
   - Silver/light green hair, blue tie, white uniform with UN PORT AUTHORITY emblem
   - Self-introduces at ~8:10: "国際連合・軌道港湾機構…弁務官セイラ・アンダース"
   - Demands navigation records under 惑星間輸送協定附則A5項
   - Taunts リア about outer-garden residents' weakness under 1G

### Scene Context
- Parallel/intercut scene during きりたん's Kestrel transit (EP03 scenes 05-06)
- リア detained for a container with broken seal ("あなたが回収したあのコンテナですが…封印が破られていました")
- セイラ asks ミューズ about communication with "ガニメデへ直接遷移した船" (likely the Kestrel)
- Establishes Port Authority's jurisdiction and enforcement at Saturn

## Changes Made

### ep03_dialogue.json
- Added 4 new speakers: port-authority-officer, lia-orpheus, muse, seira-anders
- Renamed earth-officer → port-authority-officer (scene-02 stop order)
- Updated scene-05 description (保安艇エシュロン、リア拘束)
- Updated scene-06 description (セイラがリア/ミューズにガニメデ船通信を追及)
- Updated scene-02 description (軌道港湾機構)
- Re-attributed dl-028: kestrel-ai → muse
- Re-attributed dl-029: kiritan → lia-orpheus
- Re-attributed dl-030: earth-officer → seira-anders
- Re-attributed dl-031: earth-officer → seira-anders
- Re-attributed dl-032: kiritan → lia-orpheus

### ep03_speakers.json
- Complete rewrite with 7 speakers (added lia-orpheus, muse, seira-anders, port-authority-officer)
- Updated attribution notes documenting video frame analysis methodology
- Removed "1Gに耐えられない外園居住者" from きりたん's notes (that's リア, not きりたん)

### ship-kestrel.md
- Updated G環境描写 section: quotes now attributed to リア and セイラ
- Removed "※未確定" caveats (now confirmed)

### cross-episode.md
- Updated G環境 section to name リア as the outer-garden resident in the scene

### infrastructure.md
- Updated 軌道公案機構 section: 地球軍→軌道港湾機構, added エシュロン and セイラ details
- Updated quote attribution

## Key Files Modified
- `reports/data/episodes/ep03_dialogue.json`
- `reports/data/episodes/ep03_speakers.json`
- `reports/data/summary/ship-kestrel.md`
- `reports/data/summary/cross-episode.md`
- `reports/data/summary/infrastructure.md`

## Evidence Frames (in raw_data/frames/ep03/)
- scene05_017.jpg (387s): Location telop "保安艇「エシュロン」艦内"
- scene05_023.jpg (393s): "これが「地球」です"
- scene05_035.jpg (405s): セイラ close-up with uniform
- scene05_070.jpg (440s): "あなたはリア・オルフェウス" — name revealed
- scene05_080.jpg (450s): UN PORT AUTHORITY emblem on uniform
- scene05_110.jpg (480s): リア close-up
- scene05_120.jpg (490s): "弁務官セイラ・アンダース" — name revealed
- scene05_140.jpg (510s): ミューズ close-up
- scene05_165.jpg (535s): "ではミューズ…" — AI name revealed
