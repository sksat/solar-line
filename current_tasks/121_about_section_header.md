# Task 121: ヘッダーに「この考証について」セクション追加

## Status: DONE

## Description
サイトのヘッダーナビゲーションに「この考証について」セクションを追加し、
メタ情報（セッションログ、AIコスト分析、ADR、メタ技術解説など）を
一つのカテゴリにまとめる。

## Result
- `SummaryReport` に `category?: "analysis" | "meta"` フィールドを追加
- `SiteManifest` に `metaPages` フィールドを追加（`summaryPages` と同構造）
- ai-costs.json, tech-overview.json に `category: "meta"` を設定
- `layoutHtml` に `metaPages` パラメータを追加、「この考証について」ドロップダウンを生成
- メタドロップダウンには: メタページ + 文字起こし + セッションログ
- `renderEpisode`, `renderLogsIndex`, `renderLogPage`, `renderSummaryPage`, `renderTranscriptionPage`, `renderTranscriptionIndex` すべてに `metaPages` パラメータを追加
- `build.ts` の `buildManifest` を更新して `category` でフィルタリング
- インデックスページのボディも「この考証について」セクションに統合
- 全ページのナビゲーションが3ドロップダウン構造に: 各話分析 | 総合分析 | この考証について

## Dependencies
- ts/src/templates.ts（ナビゲーション）
- ts/src/build.ts
- ts/src/report-types.ts
- Task 096 (Nav Categories) — 関連するが、096はダッシュボード寄り

## Origin
人間指示: 「ヘッダーに「この考証について」みたいなセクションを追加して、その中にセッションログや AI コスト分析、ADR、メタ技術解説などを入れるとよい」
