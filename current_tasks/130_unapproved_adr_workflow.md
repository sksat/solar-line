# Task 130: 未承認ADRによるオーナー承認待ち判断の管理

## Status: TODO

## Motivation
人間の指示: 「プロジェクトオーナーの承認が必要な判断は、未承認の ADR という形で明らかにすること」

## Scope
1. ADR テンプレートに "Proposed" ステータスを正式に定義
2. 既存の ADR を確認し、オーナー未承認のものがあれば "Proposed" に変更
3. ADR README/インデックスに "Proposed" ADR を目立つ形でリスト表示
4. 今後のワークフロー: オーナー承認が必要な判断 → Proposed ADR 作成 → 承認後 Accepted に変更

## Notes
- 現在の ADR は adr/ ディレクトリに 14 件
- GitHub Pages の「この考証について」セクションで ADR 一覧を表示中
- Proposed ADR はサイト上でも「承認待ち」と明示する
