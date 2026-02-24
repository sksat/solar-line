# Task 135: WASM ローカルテスト環境の修正

## Status: DONE

## Motivation

ローカルで `npm test` を実行すると `wasm.test.ts` の19テストが常に失敗する。
原因: `ts/pkg/` が `--target web` でビルドされているが、テストは `--target nodejs` の同期初期化を前提としている。
CI では `--target nodejs` でリビルドしてからテストを実行するため CI は通るが、ローカル開発時の品質ゲートとして機能していない。

## Scope

1. `wasm.test.ts` を `--target web` と `--target nodejs` 両方のビルドに対応させる
2. または `package.json` にテスト前の WASM ビルドステップを追加する
3. ローカルで `npm test` が全テスト通過することを確認

## Dependencies

- Task 003 (WASM bridge) — DONE
