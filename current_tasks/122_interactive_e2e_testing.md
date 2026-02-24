# Task 122: インタラクティブ要素のE2Eテスト基盤

## Status: DONE

## Description
uPlot チャート、軌道アニメーション、DAGビューア等のインタラクティブ要素について、
各ライブラリ部分にexampleページを用意し、PlaywrightでE2Eテストを行える基盤を構築する。

## Result
4 standalone example pages in `ts/examples/`:
- `uplot-chart.html`: 2 charts (thrust profile + nozzle life), CDN-loaded uPlot
- `bar-chart.html`: 2 bar charts (linear + log scale), pure CSS rendering
- `orbital-animation.html`: animated + static SVG orbital diagrams
- `dag-viewer.html`: minimal DAG with test data JSON

16 Playwright E2E tests in `ts/e2e/examples.spec.ts`:
- uPlot: canvas rendering, legends, chart titles (4 tests)
- Bar chart: bar fill elements, labels, values, annotations (4 tests)
- Orbital animation: SVG rendering, data-animated attribute, orbit circles, static diagram (5 tests)
- DAG viewer: page load, section element, data URL attribute (3 tests)

Infrastructure:
- `serve-dist.ts` updated to serve `/examples/` and `/src/` paths for standalone testing
- `dag-test-data.json`: minimal 5-node DAG fixture
- CI already runs `npx playwright test` which picks up all specs in `e2e/`

## Origin
人間指示: 「インタラクティブな要素は、ライブラリ部分は example を用意して、その example に対して Playwright などで E2E test を組むことで、unit test 的な検証を可能にするとよい」
