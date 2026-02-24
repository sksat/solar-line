# ADR-002: Rust 軌道力学コアの外部依存ポリシー

## Status

Amended (originally: zero dependencies → now: no_std-compatible dependencies allowed)

## Context

軌道力学計算コア（solar-line-core）は WASM にコンパイルしてブラウザで実行する必要がある。外部クレートを追加するとビルドサイズが増大し、WASM互換性の問題が発生する可能性がある。

一方、人間から「`no_std` 対応している nalgebra のようなものは使ってよい。計算の精度などの確からしさの確認のため、信頼できる実装をオラクルとしたテストを組むとよい」との指示があった。

## Decision

**solar-line-core は `no_std` 互換の外部クレートを使用してよい。**

- **Runtime dependencies**: `no_std` 対応ライブラリ（例: nalgebra）のみ許可。WASM ビルドとの互換性を確保。
- **Dev-dependencies**: テスト専用に信頼できる実装（オラクル）を導入してよい。本番 WASM ビルドには含まれない。
- wasm-bindgen/serde は引き続き WASM ブリッジ（solar-line-wasm）でのみ使用する。
- C/Fortran バインディング（JPL SPICE 等）は WASM 非互換のため不可。

### オラクルテスト方針

自前実装の精度を検証するため、テストコードでのみ外部ライブラリと比較する:
- nalgebra: ベクトル・行列演算の精度検証
- 既知の解析解: ケプラー方程式、ホーマン遷移、vis-viva
- JPL Horizons データ: 天体暦の精度検証（将来）

## Original Decision (superseded)

**solar-line-core は外部 Rust クレートを一切使用しない。**すべての数学関数（三角関数、ケプラー求解、軌道伝播等）を自前で実装する。

## Alternatives Considered

- **完全ゼロ依存（元の方針）**: WASM サイズ最小だが、精度検証手段が限られる。
- **nalgebra / SOFA 等の外部ライブラリ使用**: 精度・機能面で優れる。`no_std` 互換クレートなら WASM ビルドサイズの増大は許容範囲。
- **C/Fortran バインディング (JPL SPICE 等)**: 高精度だが WASM 互換性が非常に低く却下。

## Assumptions

- `no_std` 対応ライブラリの WASM ビルドは安定している
- オラクルテストにより、自前実装の精度を継続的に検証できる
- JPL 平均軌道要素の ~1° 精度がプロジェクトの分析目的に十分である
- Orekit 等との検証（Task 125）で精度不足が判明した場合、さらなる方針変更の余地がある

## Consequences

- WASM バイナリサイズは若干増大するが、`no_std` ライブラリなので許容範囲
- オラクルテストにより計算精度の信頼性が大幅に向上
- 将来の 3D 軌道解析（Task 098）で nalgebra の行列演算が活用可能
- dev-dependencies による CI テストで精度回帰を自動検出
