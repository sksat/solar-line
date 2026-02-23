# Task 019: 軌道遷移図のインタラクティブアニメーション

## Status: UNCLAIMED

## Human Directive
軌道遷移の図に、時間を操作できるインタラクティブ要素を追加する。
時間スライダーで遷移の進行を操作し、その間の天体との位置関係がどう変わるかを視覚的にわかりやすくする。

## Scope
- `ts/src/templates.ts`: renderOrbitalDiagram を拡張 or 新関数
- JavaScript: ブラウザ側でSVGを動的に更新するスクリプト
- `ts/src/report-types.ts`: OrbitalDiagram に時間関連のデータ追加（遷移時間、天体の角速度等）

## Design Considerations
- 天体の公転角速度（mean motion）を使って位置を計算
- 遷移軌道上の位置を時間パラメータで補間
- SVG内のcircle要素のtransformをJSで更新
- 時間スライダー (input[type="range"]) でコントロール
- WASM計算との統合も検討（Kepler方程式を使った正確な位置計算）

## Approach
1. nice-friendに設計相談
2. 必要なデータモデル（角速度、遷移開始/終了時刻）を定義
3. ブラウザ側JSでSVGアニメーション実装
4. 既存の静的ダイアグラムからの段階的移行

## Depends on
- Task 014 (orbital diagrams — DONE)
- Rust WASM bridge (for Kepler solver, optional)
