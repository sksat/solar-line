# Task 144: EP02・EP03 時系列チャート追加

## Status: DONE

## Motivation

EP04・EP05 には uPlot 時系列チャート（推力プロファイル、被曝量、ノズル寿命など）があるが、EP02・EP03 にはない。DESIGN.md の「マージン可視化」「時系列チャート」指示に従い、EP02・EP03 にも時間軸のチャートを追加し、ミッションの時間的ダイナミクスを直感的に把握できるようにする。

## Scope

### EP02: 太陽中心座標速度プロファイル
- 木星圏脱出〜土星圏到着の約455日間のヘリオセントリック速度変化
- vis-viva による楕円軌道上の速度計算
- 出発速度（~18.3 km/s）→ 遠日点（~5-6 km/s）のプロファイル
- 参考線: 木星軌道速度、土星軌道速度

### EP03: Brachistochrone 推力プロファイル
- 143時間12分の brachistochrone 遷移（土星→天王星）
- 加速フェーズ → フリップ → 減速フェーズ
- 推力9.8MN（公称）のプロファイル
- 参考: 航法危機の発生タイミング

## Dependencies
- TimeSeriesChart type in report-types.ts (existing)
- uPlot rendering in templates.ts (existing)
