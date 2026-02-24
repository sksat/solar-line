# Task 116: CI 安定性の改善

## Status: DONE (partial — this session fixed immediate issues)

## Motivation

人間の指示: 「CI がコケてる。ほぼ常に CI pass を維持できるようなワークフローにしたい」

## Completed

1. `cargo fmt --all` で Rust コードフォーマット修正（dag.rs, lib.rs）
2. E2E テスト修正: ナビドロップダウン対応（hover で展開してからリンクチェック）
3. ビルドエラー修正: other-ships.json の OrbitalDiagram フィールド名修正

## Remaining (for future sessions)

- Pre-commit hook で cargo fmt --check + typecheck を自動実行
- CI で flaky test のリトライ設定
- ビルド成果物のキャッシュ最適化
- コミット前のローカル CI チェックをドキュメント化
