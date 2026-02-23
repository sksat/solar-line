# Task 017: レポート構造改善

## Status: UNCLAIMED

## Human Directives (複数の指示をまとめたタスク)

### 1. 根拠台詞の引用を自然にする
現在: 各transferCardの下に「根拠となる台詞」セクションが別カードとして表示される → しつこい
改善: 台詞引用をanalysis本文中に自然に組み込む。例えば説明文の中にインラインで「きりたん「...」(10:05)」を入れるなど。

### 2. 分析の入れ子構造
現在: transfers と explorations が別セクションとしてフラットに並んでいる
改善: 分析する問題（transfer）→ その問題に対する複数ケースの想定（exploration）が入れ子構造としてわかりやすくなるようにする

### 3. シナリオの順序と折りたたみ
- 最も妥当性が高いと判断したシナリオを最初に表示
- ありえなさすぎるシナリオはデフォルトで `<details>` で折りたたむ

### 4. ブラキストクローネの表記
- 日本語で「ブラキストクローネ」とカタカナで書くことは少ない
- 英語表記 "brachistochrone" または数式/概念名として表記する方が自然
- templates.ts の `transferStyleLabel` や `renderCalculator` のUI文字列を修正

## Scope
- `ts/src/templates.ts`: renderEpisode, renderTransferCard, renderExplorations, transferStyleLabel
- `ts/src/report-types.ts`: ExplorationScenario に priority/collapsible フィールド追加の可能性
- Episode JSON data files: scenario ordering, ep01 quote fixes

## Approach (TDD)
1. テストでレンダリング出力の構造を検証
2. テンプレート修正
3. 必要に応じて report-types.ts の型拡張
4. エピソードJSONデータの調整

## Depends on
- Task 016 (カードoverflow修正はこのタスクの前提)
