# Task 104: uPlot による時系列グラフ基盤

## Status: DONE

## Motivation

Human directive: インタラクティブな時系列グラフのようなものを作る場合、uPlot を使うとよい。

## Scope

1. **uPlot 導入**:
   - CDN または npm で uPlot を導入
   - レポートテンプレートに uPlot のロードを追加

2. **時系列グラフコンポーネント**:
   - レポートの JSON データから uPlot グラフを生成する仕組み
   - report-types.ts に TimeSeriesChart 型を追加
   - templates.ts にレンダラーを追加

3. **適用先** (Task 095 マージン可視化と連携):
   - 推力プロファイル（時間 vs 推力レベル）
   - 累計放射線量（時間 vs mSv）
   - ノズル残寿命（時間 vs 残%）
   - 速度プロファイル（時間 vs km/s）

## Dependencies
- Task 095 (margin visualization — TODO) で活用

## Notes
- uPlot は軽量・高速な時系列チャートライブラリ
- 既存の renderBarChart は SVG 手書き → uPlot は Canvas ベース
- バーチャートは既存実装を維持、時系列のみ uPlot を使用
