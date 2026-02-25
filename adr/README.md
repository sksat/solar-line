# Architecture Decision Records (ADR)

SOLAR LINE 考察プロジェクトの設計・分析に関する意思決定の記録。

## ADR 一覧

| # | タイトル | Status |
|---|---------|--------|
| [001](001-report-language.md) | レポートの日本語化 | Accepted |
| [002](002-zero-rust-deps.md) | Rust 軌道力学コアの外部依存ゼロ | Accepted |
| [003](003-flat-f64-wasm-api.md) | WASM ブリッジの Flat f64 API | Accepted |
| [004](004-two-phase-dialogue.md) | 二段階の台詞パイプライン | Accepted |
| [005](005-custom-markdown-renderer.md) | 独自 Markdown レンダラー | Accepted |
| [006](006-verdict-policy.md) | 判定（Verdict）ポリシー | Accepted |
| [007](007-sf-tolerance.md) | SF 作品としての分析姿勢 | Accepted |
| [008](008-brachistochrone-terminology.md) | Brachistochrone 用語の表記 | Accepted |
| [009](009-sqrt-scale-orbital-diagrams.md) | 軌道図の sqrt スケールモード | Accepted |
| [010](010-subagent-delegation.md) | サブエージェントのモデル選択基準 | Accepted |
| [011](011-nice-friend-reanalysis.md) | Codex (nice-friend) による反復的再分析 | Accepted |
| [012](012-jst-timestamps.md) | セッションログの JST タイムスタンプ | Accepted |
| [013](013-cdn-libraries.md) | CDN ベースの外部ライブラリ | Accepted |
| [014](014-source-priority.md) | 本編優先の分析原則 | Accepted |
| [015](015-naming-kousatsu-vs-koushou.md) | プロジェクト名称 — 考察 vs 考証 | Proposed |

## ADR の追加方法

1. `adr/` に `NNN-<slug>.md` を作成
2. [テンプレート](000-template.md) に従って記述
3. 本 README の一覧表に追加

## ステータスの定義

| Status | 意味 |
|--------|------|
| **Proposed** | プロジェクトオーナーの承認待ち。AIエージェントが提案した判断で、オーナーの確認が必要なもの。 |
| **Accepted** | 承認済み。プロジェクトの方針として適用中。 |
| **Superseded** | 新しい ADR に置き換えられた。 |
| **Deprecated** | 廃止。もはや適用されない。 |

**ワークフロー:** オーナー承認が必要な判断 → Proposed ADR 作成 → オーナー確認後 Accepted に変更。
