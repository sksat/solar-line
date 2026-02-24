# ADR-003: WASM ブリッジの Flat f64 API

## Status

Accepted (Codex-reviewed)

## Context

WASM 境界を越えて Rust のニュータイプ（Km, KmPerSec, Seconds 等）をそのまま渡すと、serde シリアライゼーションのオーバーヘッドと複雑性が増す。

## Decision

**WASM 公開関数はすべて f64 スカラー値を受け取り、f64 を返す。**ニュータイプの wrap/unwrap は WASM 境界で行う。Codex とのレビューで「flat API は正しいアプローチ」と確認。

## Alternatives Considered

- **serde でニュータイプをシリアライズ**: 型安全だが serde + serde-wasm-bindgen のオーバーヘッドが各関数呼び出しに発生。
- **JsValue 経由の構造体受け渡し**: DAG 分析等の複雑な入出力には採用中。スカラー計算には過剰。
- **wasm-bindgen のカスタム型サポート**: 将来的に改善される可能性があるが、現時点では不安定。

## Assumptions

- WASM 境界を越える関数は主にスカラー計算（ΔV, 質量比, 軌道周期等）である
- TypeScript 側で引数の物理単位を間違えるリスクは、テストとドキュメントで管理可能

## Consequences

- TypeScript 側のコードがシンプルになる（型変換不要）
- Rust 側では内部的に型安全性を維持
- パフォーマンスが最適化（serde シリアライゼーション不要）
- 関数のシグネチャだけでは引数の物理的意味がわからない → ドキュメントとテストで補完
