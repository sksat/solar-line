# Task 110: コンテナ分離・推進剤損失の質量時系列分析

## Status: IN PROGRESS

## Motivation

人間の指示: 「コンテナの分離および推進剤損失による質量変更があるはず。それの時系列分析と可視化もしたい。複数パターンの想定で。」

ケストレル号の質量は航行中に変化する:
- コンテナ分離（EP01: 火星でのコンテナ切り離し）
- 推進剤消費（各バーンでのロケット方程式に基づく質量減少）
- 損傷による損失（EP04: プラズモイド被害）

## Scope

### 1. Rust 質量モデル (solar-line-core)
- `mass_timeline.rs`: 質量変化イベントの時系列モデル
  - MassEvent enum: FuelBurn, ContainerJettison, DamageEvent
  - Tsiolkovsky 方程式での推進剤消費計算
  - イベントリストから時系列の質量プロファイル生成

### 2. 複数パターンの想定
- パターン A: 公称値ベース（48,000t 初期質量、設定資料準拠）
- パターン B: 299t 上限ベース（EP01 質量境界から逆算）
- パターン C: 推進剤最適化（各バーンの推進剤を最小化する質量配分）
- 各パターンで最終質量、推進剤残量、マージンを比較

### 3. 可視化
- uPlot 時系列チャート: 横軸=ミッション経過時間、縦軸=質量
  - 各バーンでの急激な減少
  - コンテナ分離でのステップ変化
  - 複数パターンを重ねて表示
- 質量内訳のスタック棒グラフ（構造体/推進剤/貨物/コンテナ）
- 各エピソードの質量変化をアノテーション付きで表示

### 4. レポート統合
- `ship-kestrel.json` に質量時系列セクション追加
- 各話分析に質量パラメータの裏付けとして引用

## Dependencies

- Task 045 (propellant analysis) — DONE
- Task 104 (uPlot timeseries) — TODO
- Rust orbital core (orbits.rs の mass_ratio, propellant_fraction 等) — DONE
