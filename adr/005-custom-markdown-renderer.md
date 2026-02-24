# ADR-005: 独自 Markdown レンダラー

## Status

Accepted

## Context

レポートの Markdown → HTML 変換に外部ライブラリ（marked, remark 等）を使うか、プロジェクト固有のニーズに合わせた独自実装を使うか。

## Decision

**`markdownToHtml()` を独自実装する。**外部 Markdown パーサーへの依存を避け、プロジェクト固有の機能（エピソードリンクの自動生成、KaTeX 数式、コードブロックの言語クラス付与等）を直接組み込む。

## Alternatives Considered

- **marked / remark**: 成熟したパーサーだが、プロジェクト固有の拡張（エピソードリンク、KaTeX統合）の組み込みが煩雑。プラグイン API はあるが学習コストがある。
- **MDX**: コンポーネントベースの Markdown。レビュー容易性向上のため将来移行を検討中（Task 127）。現時点では既存パイプラインとの整合性を優先。

## Assumptions

- CommonMark の全機能は不要（ネスト引用等の未対応機能はレポートで使用しない）
- プロジェクト固有の機能（エピソード間リンク自動生成等）は外部パーサーでは対応困難
- MDX 移行が決定された場合（Task 127）、本 ADR は superseded となる可能性がある

## Consequences

- 外部依存ゼロ（package.json に marked 等不要）
- プロジェクト固有の機能追加が容易
- 完全な CommonMark 準拠ではない（ネスト引用等の一部機能は未対応）が、レポート用途には十分
- 保守コストは開発チーム（=エージェント）が負担
