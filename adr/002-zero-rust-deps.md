# ADR-002: Rust 軌道力学コアの外部依存ゼロ

## Status

Accepted

## Context

軌道力学計算コア（solar-line-core）は WASM にコンパイルしてブラウザで実行する必要がある。外部クレートを追加するとビルドサイズが増大し、WASM互換性の問題が発生する可能性がある。

## Decision

**solar-line-core は外部 Rust クレートを一切使用しない。**すべての数学関数（三角関数、ケプラー求解、軌道伝播等）を自前で実装する。wasm-bindgen/serde は WASM ブリッジ（solar-line-wasm）でのみ使用する。

## Alternatives Considered

- **nalgebra / SOFA 等の外部ライブラリ使用**: 精度・機能面で優れるが、WASM ビルドサイズ増大と互換性リスクがある。CLAUDE.md では `no_std` 互換クレートの使用は許容しており、将来的に緩和の余地あり。
- **C/Fortran バインディング (JPL SPICE 等)**: 高精度だが WASM 互換性が非常に低く却下。

## Assumptions

- JPL 平均軌道要素の ~1° 精度がプロジェクトの分析目的に十分である
- Orekit 等との検証（Task 125）で精度不足が判明した場合、方針を再検討する可能性がある
- WASM ビルドサイズの最小化はユーザー体験に直結する

## Consequences

- WASM バイナリサイズが最小化される
- ビルドの再現性と長期保守性が向上
- 実装コストは増加するが、教育的価値もある（軌道力学の基礎を一から構築）
- 高精度な外部天文ライブラリ（SOFA等）は使えないが、JPL平均軌道要素で十分な精度（~1°）を達成
