# Task 117: 誤差範囲の可視化

## Status: DONE

## Motivation

人間の指示: 「誤差に関する意思決定がよくあるが、時系列グラフや軌道遷移図において誤差の範囲も可視化できるとよりわかりやすくなる」

## Scope

1. 時系列グラフ（uPlot）での誤差バンド表示:
   - 推力プロファイルの不確実性範囲
   - 質量推定の範囲（複数パターン間のバンド）
   - 放射線量の測定誤差
2. 軌道遷移図での誤差表示:
   - 到達位置の不確実性を楕円/扇形で表示
   - パラメータ誤差による軌道バリエーションの重ね描き
3. レポート内のパラメータ表示:
   - 値 ± 誤差 の表記標準化
   - 誤差の由来（測定精度、パラメータ不確実性、モデル近似）の区別

## Dependencies

- Task 104 (uPlot timeseries) — DONE
- Task 109 (burn position alignment) — DONE

## Implementation

### Types (report-types.ts)
- `TimeSeriesDatum`: Added `yLow?`, `yHigh?` (error band bounds), `errorSource?` ("measurement" | "parameter" | "model")
- `UncertaintyEllipse`: New type for orbital diagram uncertainty regions (orbitId, semiMajor/Minor, rotation, color, label)
- `TrajectoryVariation`: New type for parameter sensitivity overlays on transfer arcs (baseTransferLabel, color, label, spread)
- `OrbitalDiagram`: Added `uncertaintyEllipses?`, `trajectoryVariations?`

### uPlot Error Bands (templates.ts inline JS)
- Detects `yLow`/`yHigh` on series data
- Creates hidden upper/lower bound series in uPlot
- Uses uPlot's `bands` feature to fill between bounds with semi-transparent color
- Alpha derived from series color (hex → +33, rgba → 0.15)

### Orbital Diagram Uncertainty (templates.ts renderOrbitalDiagram)
- Renders `<ellipse>` SVG elements at orbit positions for uncertainty regions
- Renders trajectory variation overlays as wide semi-transparent stroke copies of base transfer arcs
- Legend entries for both types, filtered to only show rendered elements
- Skips ellipses for orbits without defined angle

### Data Applied
- **EP04 radiation dose chart**: Error band showing shield-normal (144 mSv) to worst-case (1,056 mSv) range
- **EP05 nozzle life chart**: Error band showing -5% to +1% burn time sensitivity (margin 3.19h to -0.12h)
- **EP03 orbital diagram**: Uncertainty ellipse at nav-crisis position (1.23° angular error → ~14.36M km)

### Example HTML
- `ts/examples/uplot-chart.html`: Added third chart demonstrating error band rendering

### Tests
- 12 new unit tests in templates.test.ts (uncertainty ellipses, trajectory variations, error bands)
- 8 new data validation tests in report-data-validation.test.ts (yLow/yHigh length, ellipse referential integrity)
- Updated E2E test expectations for 3-chart example page
- All 667 relevant tests pass
