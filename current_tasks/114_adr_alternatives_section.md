# Task 114: ADR に Alternatives セクション追加

## Status: DONE

## Motivation

人間の指示: 「ADR には alternative などのセクションも欲しい。意思決定を後で変更する際に、どんな前提で意思決定が行われ、他にどんな選択肢があったのかの記録が重要になる。」

## Scope

1. ADR テンプレート (`adr/000-template.md`) を更新:
   - `## Alternatives Considered` セクション追加
   - `## Assumptions` セクション追加（意思決定の前提）
   - `## Consequences` セクション明確化
2. 既存の14 ADR を遡及的に更新:
   - 各 ADR に alternatives と assumptions を追記
   - 特に重要なもの: ADR 003 (zero-deps → no_std許可), ADR 004 (WASM API), ADR 005 (dialogue pipeline)
3. ADR のマイケル・ナイガード形式への準拠確認

## Dependencies

- Task 086 (ADR) — DONE
- Task 112 (Rust deps) — TODO (ADR 003 の更新が必要)
