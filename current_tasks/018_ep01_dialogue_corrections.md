# Task 018: 第1話台詞データ修正

## Status: UNCLAIMED

## Human Directives
- 第一話の依頼（ep01-quote-01「火星中央港からガニメデ中央港まで、72時間以内に届けてほしい」）は、
  きりたんへの依頼であって、きりたんの台詞ではない。話者を修正する必要がある。
- タイムスタンプも 02:15 ではなく 01:14 あたりだと人間が指摘。確認・修正が必要。

## Scope
- `reports/data/episodes/ep01.json`: dialogueQuotes の speaker と timestamp を修正
- ep01_dialogue.json (もし存在すれば) の整合性確認

## Approach
1. 動画を確認して正確な発話者とタイムスタンプを特定（人間のフィードバックを信頼）
2. ep01.json の dialogueQuotes を修正
3. source citations 内のタイムスタンプも整合性確認

## Depends on
- Task 009 (subtitle attribution — 関連するが独立して修正可能)
