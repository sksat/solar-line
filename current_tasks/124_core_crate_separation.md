# Task 124: コアロジックのcore crate分離（wasm crateはbind専任）

## Status: DONE

## Description
現在 wasm bind 用の crate (solar-line-wasm) にコアロジックが混在していないか確認し、
コアロジックは core crate (solar-line-core) に集約する。
wasm crate の責務はあくまでバインディング（型変換、エラーハンドリング）に限定する。

## Approach
1. 現在の solar-line-wasm の内容を監査
2. コアロジックが wasm crate にあれば core に移動
3. wasm crate は薄いバインディングレイヤーのみに
4. テスト確認（Rust unit tests + WASM build）

## Result
Audit completed: the wasm crate is already correctly structured as a pure binding layer.
- All 50+ exported functions delegate to solar-line-core
- Only binding-layer concerns in wasm crate: serde structs, parse_planet(), parse_dag_state()
- Energy drift computation in propagation wrappers is presentation-layer logic, acceptable at boundary
- No core logic found that needs migration

## Dependencies
- crates/solar-line-core/
- crates/solar-line-wasm/

## Origin
人間指示: 「コアロジックは wasm bind 用の crate ではなく他の core crate などに入れておき、wasm bind 用の crate のメインの責務はあくまで bind に留めること」
