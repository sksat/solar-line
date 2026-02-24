# ADR-003: WASM ブリッジの Flat f64 API

## Status

Accepted (Codex-reviewed)

## Context

WASM 境界を越えて Rust のニュータイプ（Km, KmPerSec, Seconds 等）をそのまま渡すと、serde シリアライゼーションのオーバーヘッドと複雑性が増す。

## Decision

**WASM 公開関数はすべて f64 スカラー値を受け取り、f64 を返す。**ニュータイプの wrap/unwrap は WASM 境界で行う。Codex とのレビューで「flat API は正しいアプローチ」と確認。

## Consequences

- TypeScript 側のコードがシンプルになる（型変換不要）
- Rust 側では内部的に型安全性を維持
- パフォーマンスが最適化（serde シリアライゼーション不要）
- 関数のシグネチャだけでは引数の物理的意味がわからない → ドキュメントとテストで補完
