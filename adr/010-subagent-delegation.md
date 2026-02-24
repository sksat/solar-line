# ADR-010: サブエージェントのモデル選択基準

## Status

Accepted

## Context

Claude Code はサブエージェントに異なるモデル（Haiku, Sonnet, Opus）を指定できる。Haiku は安価で高速だが能力が低く、Opus は高能力だが高コスト。

## Decision

**以下の基準でモデルを選択する:**

- **Haiku (default):** ファイル探索、コードベース検索、単純なリサーチ
- **Sonnet:** 複雑なコードレビュー、多段階の推論が必要なタスク
- **Opus:** 最終的な設計判断レビュー、クリティカルな分析の検証

探索・リサーチ系のサブエージェントには `max_turns` を設定してスコープを制限する。

## Consequences

- Haiku サブエージェントのコストは 1起動あたり ~$0.05
- 総コストの 100%（Max 外）が Haiku → $6.57/VMブート
- 品質クリティカルなタスクでは Sonnet/Opus に切り替え可能
