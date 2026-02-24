# Task 009: Subtitle Collection & Speaker Attribution

## Status: DONE

## Progress
- [x] Architecture design (two-phase pipeline, Codex-reviewed)
- [x] Phase 1 types: `dialogue-extraction-types.ts` (ExtractedLine, EpisodeLines, MergeConfig)
- [x] Phase 1 logic: `dialogue-extraction.ts` (shouldMergeCues, mergeCueTexts, extractLines, validateEpisodeLines)
- [x] Phase 1 tests: 25 tests, all passing
- [x] Phase 1 CLI: `extract-dialogue.ts` (npm run extract-dialogue)
- [x] Subtitle collection: Downloaded ja-orig and ja tracks for Episode 1 (CQ_OkDjEwRk)
- [x] Extraction run: 478 raw cues → 239 filtered → 87 dialogue lines → ep01_lines.json
- [x] EP01 Phase 2: ep01_speakers.json (6 speakers) + ep01_dialogue.json (86 entries, 8 scenes)
- [x] EP02 Phase 2: ep02_speakers.json (4 speakers) + ep02_dialogue.json (102 entries, 9 scenes)
- [x] EP03 Phase 2: ep03_speakers.json (4 speakers) + ep03_dialogue.json (53 entries, 10 scenes)
- [x] EP04 Phase 2: ep04_speakers.json (5 speakers) + ep04_dialogue.json (34 entries, 10 scenes)
- [x] EP05 Phase 1: Whisper STT → 164 extracted lines → ep05_lines.json
- [x] EP05 Phase 2: ep05_speakers.json (5 speakers) + ep05_dialogue.json (113 entries, 13 scenes)
- [x] EP05 report updated: 24 dialogue quotes, evidence quote IDs linked to all 5 transfers
- [x] All tests pass (830 TS + 79 Rust = 909 total)
- [x] Site builds: 5 episodes, 24 transfers, 3 summaries, 7 logs

## EP05 Speakers (5)
1. きりたん — 船長、カジュアル男性口調
2. ケストレルAI（ケイ） — 船載AI、敬語、船ステータス報告
3. ミューズ — エンケラドスリレー基地、EP02から再登場、校正信号発信
4. ライ — ガニメデのパイロット、EP01から再登場、欺瞞航跡
5. 弁務官セイランダース — 国際連合軌道交番機構、停船命令

## EP05 Key Dialogue Findings
- 推定所要時間507時間（21.1日）— 純粋brachistochroneではなく複合航路
- 巡航速度1500km/s、最終速度2100km/s（核魚雷射程外）
- 点火4回: 天王星脱出→木星パワードフライバイ→火星減速→地球LEO投入
- ノズル残寿命55h38m vs 必要燃焼55h12m（マージン26分）
- 自律航法精度: 天王星→小惑星帯で20km誤差（ビーコン誘導なら50m）
- 地球がソーラーライン航路誘導網を全面停波（太陽系700隻巻き添え）
- LEO 400km投入完了後ノズル消失→「この船はもう飛べません」

## Whisper ASR Corrections (EP05)
- 「天皇星/天皇聖剣/天皇聖人」→「天王星/天王星圏/天王星人」
- 「時期のずる/のずる」→「磁気ノズル/ノズル」
- 「交法/公報/広報」→「航法」
- 「構成/称号」→「校正/照合」
- 「格魚雷」→「核魚雷」
- 「高腕交差」→「港湾交差」
- 「東京」→「天王星人」（文脈から明確）
- 「水深炉」→「水素炉」

## Architecture
- Phase 1 (Extraction): `epXX_lines.json` — automated, raw text+timing
- Phase 2 (Attribution): `epXX_dialogue.json` — context-assisted speaker assignment
- Speaker registry: `epXX_speakers.json` — character definitions
- Files are separate so re-running extraction doesn't lose attribution

## Depends on
- Task 004 (subtitle collection pipeline)
- Task 036 (Whisper STT infrastructure)
