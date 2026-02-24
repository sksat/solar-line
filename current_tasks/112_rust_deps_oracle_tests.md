# Task 112: Rust 依存ライブラリ解禁とオラクルテスト

## Status: DONE

## Motivation

人間の指示: 「Rust の依存ライブラリに関して。wasm ビルドするので、no_std 対応している nalgebra のようなものは使ってよい。計算の精度などの確からしさの確認のため、信頼できる実装をオラクルとしたテストを組むとよい。」

現在のプロジェクトは zero external Rust dependencies ポリシーだが、no_std 対応のライブラリは WASM ビルドと互換性がある。

## Scope

1. ADR を更新: zero-deps ポリシーを「no_std 対応ライブラリは許可」に変更 ✅
2. nalgebra (no_std) を導入検討: ✅
   - Vec3 操作、行列計算、座標変換
   - 現在の手書き実装との精度比較
3. オラクルテスト体制の構築: ✅
   - nalgebra をテスト依存に追加 (dev-dependency)
   - テストケースで自前実装の出力と比較
   - dev-dependencies としてのみ追加（本番ビルドには含まない）
4. 精度保証テスト: ✅ (partially — JPL Horizons comparison deferred to Task 125)
   - 軌道伝搬のエネルギー保存・角運動量保存を検証
   - Kepler ソルバーのラウンドトリップ精度を検証
   - ホーマン遷移 ΔV を教科書値と照合

## Implementation

- **ADR-002 amended**: zero-deps → no_std-compatible deps allowed
- **nalgebra 0.33** added as dev-dependency to solar-line-core
- **34 oracle tests** across 2 test files:
  - `tests/oracle_tests.rs` (24 tests): Vec3 vs nalgebra, vis-viva, Hohmann ΔV, Kepler round-trip, Tsiolkovsky, brachistochrone, Oberth effect
  - `tests/oracle_propagation.rs` (10 tests): RK4/adaptive/symplectic energy conservation, cross-integrator comparison, heliocentric propagation, angular momentum conservation
- **WASM build verified**: nalgebra in dev-deps does not affect WASM output

## Accuracy Findings

- RK4 (dt=10s): <1e-8 relative energy drift over 100 LEO periods
- RK45 adaptive: ~1.2e-6 energy drift over 100 LEO periods (rtol=1e-8)
- Symplectic (dt=10s): <1e-8 over 1000 LEO periods (bounded oscillation)
- Heliocentric (Earth, 1 year): <1e-10 energy drift, <1e-6 position return error
- RK4 vs RK45: <1 km GEO position difference after 1 period
- RK4 vs Symplectic: ~18 km LEO difference after 10 periods (phase drift, not accuracy issue)

## Dependencies

- ADR 002 (zero-deps) — Updated ✅
