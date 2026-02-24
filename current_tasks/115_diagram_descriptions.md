# Task 115: 軌道遷移図に description フィールド追加

## Status: DONE

## Motivation

人間の指示: 「軌道遷移図には、タイトルだけでなくなんのためのどんな分析で、そこから何が読み取れるのかといった description も入れられるとよい」

## Scope

1. `OrbitalDiagram` 型に `description?: string` フィールド追加
2. テンプレート (`renderOrbitalDiagram`) で description をキャプション下に表示
3. 既存の全軌道遷移図に description を追記:
   - EP01: 1 diagram
   - EP02: 3 diagrams
   - EP03: 2 diagrams
   - EP05: multiple diagrams
   - Summary: cross-episode, other-ships
4. description の内容: 分析の目的、注目すべきポイント、読み取れること

## Dependencies

- Task 014 (orbital diagrams) — DONE
- Task 019 (orbital animation) — DONE
