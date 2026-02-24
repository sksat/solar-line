# Task 113: 内部ドキュメントのサイト公開

## Status: TODO

## Motivation

人間の指示: 「current_tasks や ADR などの内部ドキュメントもサイト上で見られるようにしたい」

## Scope

1. ビルドパイプラインに内部ドキュメントの変換を追加:
   - `current_tasks/*.md` → HTML（タスク一覧ページ + 個別ページ）
   - `adr/*.md` → HTML（ADR 一覧 + 個別ページ）
   - `ideas/*.md` → HTML（アイデア一覧）
2. ナビゲーションに「開発ドキュメント」セクションを追加
3. タスクステータスのバッジ表示（TODO/IN_PROGRESS/DONE）
4. ADR のステータス表示（accepted/superseded 等）

## Dependencies

- Task 086 (ADR) — DONE
- Task 096 (nav categories) — TODO
