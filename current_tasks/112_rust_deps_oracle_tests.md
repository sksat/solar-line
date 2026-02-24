# Task 112: Rust 依存ライブラリ解禁とオラクルテスト

## Status: TODO

## Motivation

人間の指示: 「Rust の依存ライブラリに関して。wasm ビルドするので、no_std 対応している nalgebra のようなものは使ってよい。計算の精度などの確からしさの確認のため、信頼できる実装をオラクルとしたテストを組むとよい。」

現在のプロジェクトは zero external Rust dependencies ポリシーだが、no_std 対応のライブラリは WASM ビルドと互換性がある。

## Scope

1. ADR を更新: zero-deps ポリシーを「no_std 対応ライブラリは許可」に変更
2. nalgebra (no_std) を導入検討:
   - Vec3 操作、行列計算、座標変換
   - 現在の手書き実装との精度比較
3. オラクルテスト体制の構築:
   - nalgebra や既知の天体力学ライブラリ（Rust の nyx-space 等）をテスト依存に追加
   - テストケースで自前実装の出力と比較
   - dev-dependencies としてのみ追加（本番ビルドには含まない）
4. 精度保証テスト:
   - 軌道伝搬の精度を JPL Horizons データと照合
   - Kepler ソルバーの精度を高精度ライブラリと照合

## Dependencies

- ADR 003 (zero-deps) — 要更新
