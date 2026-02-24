# Task 095: "ギリギリ" Margin Visualization

## Status: DONE

## Motivation
Human directive: どのように"ギリギリ"だったのかをわかりやすく可視化してほしい。そのために典型的に想定される他パターンの分析をするとよい。

## Result
All margin visualizations complete:
- [x] EP05: Nozzle remaining life chart + thrust profile (Task 104)
- [x] EP04: Cumulative radiation dose chart + shield life chart (prior session)
- [x] EP01: Mass boundary chart — ship mass vs minimum transit time (72h/150h thresholds, 9.8MN + 65% 6.3MN curves)
- [x] Summary: Mission timeline margin chart — margin % vs cumulative mission days
- [x] Summary: Actual-vs-limit comparison chart — constraint consumption % for EP02-EP05
- [x] Existing bar chart: Margin cascade (EP02 2.9% → EP05 0.78%)

Charts added to:
- `reports/data/episodes/ep01.json` — 1 new time-series chart
- `reports/data/summary/cross-episode.json` — 2 new time-series charts in マージン連鎖分析 section

## Related
- EP04: 480 mSv / 500 mSv ICRP limit (96%)
- EP05: 55h12m / 55h38m nozzle life (99.2%)
- EP01: mass boundary ~299t
