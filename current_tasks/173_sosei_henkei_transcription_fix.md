# Task 173: 蘇生変形→塑性変形 文字起こし修正

## Status: DONE

## Motivation

EP05レポートレビューで発見: ASR（自動音声認識）が「塑性変形」(sosei henkei = plastic deformation) を同音の「蘇生変形」(sosei henkei = resurrection deformation) と誤認識していた。EP01の Phase 2 対話修正では正しく「塑性変形」に修正されていたが、EP05では修正漏れがあった。

物理的に正しい用語は「塑性変形」（高温クリープ変形）であり、「蘇生変形」は日本語として意味をなさない。

## Scope

以下のファイルを修正:
1. `reports/data/episodes/ep05.json` — レポート本文・用語集
2. `reports/data/episodes/ep05_dialogue.json` — Phase 2 対話テキスト
3. `reports/data/summary/ship-kestrel.json` — 船舶レポート
4. `ts/src/ep05-analysis.ts` — 分析コードのコメント

修正対象外（生データ）:
- `ep05_lines_vtt.json` — 生VTTデータ
- `ep05_lines.json` — Phase 1 抽出データ
- `ep01_lines.json`, `ep01_lines_whisper.json` — 生データ
- `ep01_dialogue.json` — 既に修正済み（修正ノートあり）

## Notes

- 蘇生(resurrection)と塑性(plastic)は同音「そせい」
- VOICEROID音声のASR誤認識として典型的なパターン
- EP05用語集に「ASR誤認識パターン」の注記を追加
