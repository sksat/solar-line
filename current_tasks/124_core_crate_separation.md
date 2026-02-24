# Task 124: コアロジックのcore crate分離（wasm crateはbind専任）

## Status: TODO

## Description
現在 wasm bind 用の crate (solar-line-wasm) にコアロジックが混在していないか確認し、
コアロジックは core crate (solar-line-core) に集約する。
wasm crate の責務はあくまでバインディング（型変換、エラーハンドリング）に限定する。

## Approach
1. 現在の solar-line-wasm の内容を監査
2. コアロジックが wasm crate にあれば core に移動
3. wasm crate は薄いバインディングレイヤーのみに
4. テスト確認（Rust unit tests + WASM build）

## Dependencies
- crates/solar-line-core/
- crates/solar-line-wasm/

## Origin
人間指示: 「コアロジックは wasm bind 用の crate ではなく他の core crate などに入れておき、wasm bind 用の crate のメインの責務はあくまで bind に留めること」
