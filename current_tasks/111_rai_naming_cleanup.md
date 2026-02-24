# Task 111: 「ライ」呼称の最終クリーンアップ

## Status: DONE

## Motivation

人間の指示: 「未だに勝手に命名した『ライ』という呼称が見受けられる」

## Completed Work

1. `ep01_dialogue.json`: 18 note フィールドの「ライ」→「船乗り」修正
2. `ep05_dialogue.json`: 8 note フィールド + 1 scene description 修正
3. `ep01_speakers.json`: notes から「ライ」仮称の記述を削除
4. `ep05_speakers.json`: 同上
5. `ep01_dialogue.json` attributionNotes: 「ライ」→「船乗り」修正
6. Session log `2026-02-24-session-e186.md`: 3箇所修正

全 197 件のレポートバリデーションテスト通過確認済み。

## Notes

- speaker ID は `rai` のまま（データ互換性のため変更不要 — 内部IDは表示されない）
- 「ソーラーライン」「オライオン」「フライバイ」等の複合語は影響なし
