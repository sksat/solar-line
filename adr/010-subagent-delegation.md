# ADR-010: サブエージェントのモデル選択基準

## Status

Superseded — Sonnet がデフォルトモデルに変更済み（CLAUDE.md 参照）

## Context

Claude Code はサブエージェントに異なるモデル（Haiku, Sonnet, Opus）を指定できる。Haiku は安価で高速だが能力が低く、Opus は高能力だが高コスト。

## Decision

**以下の基準でモデルを選択する:**

- **Haiku (default):** ファイル探索、コードベース検索、単純なリサーチ
- **Sonnet:** 複雑なコードレビュー、多段階の推論が必要なタスク
- **Opus:** 最終的な設計判断レビュー、クリティカルな分析の検証

探索・リサーチ系のサブエージェントには `max_turns` を設定してスコープを制限する。

## Alternatives Considered

- **全タスク Opus**: 品質は最高だが、単純な検索タスクにはコスト過剰。
- **全タスク Haiku**: 安価だが、コスト分析（Task 066）で品質不足が判明。Haiku は不採用に修正済み。
- **サブエージェント不使用**: メインコンテキストで全処理。コンテキストウィンドウの圧迫が問題。

## Assumptions

- Haiku の品質不足は本プロジェクトの複雑さに起因し、他プロジェクトでは問題ない可能性がある
- **注**: 実運用で Haiku 品質不足が確認され、CLAUDE.md では Sonnet をデフォルトに変更済み。本 ADR の Haiku デフォルト推奨は事実上 superseded。

## Consequences

- Haiku サブエージェントのコストは 1起動あたり ~$0.05
- 総コストの 100%（Max 外）が Haiku → $6.57/VMブート
- 品質クリティカルなタスクでは Sonnet/Opus に切り替え可能
