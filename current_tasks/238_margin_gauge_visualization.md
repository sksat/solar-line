# Task 238: Margin Gauge Visualization Component

## Status: DONE

## Description

Add a margin gauge visualization component — horizontal bar charts that show how close each critical parameter was to its limit. DESIGN.md specifically calls for "ゲージ/バーチャート: 各パラメータが限界値にどこまで近づいたかを一目で示す".

## Scope

### 1. Component: `margin-gauge` MDX code fence type
- New MDX code fence type `margin-gauge` parsed in mdx-parser.ts / episode-mdx-parser.ts
- Rendered as horizontal bars showing actual vs limit
- Color coding: green (safe, >20%), yellow (tight, 5-20%), red (critical, <5%)
- Shows percentage and absolute values

### 2. Data: Add margin gauges to cross-episode.md
Key margins to visualize:
- **Nozzle life**: 55h38m available vs 55h12m used → 26 min margin (0.78%)
- **Radiation dose**: ~560 mSv total vs 600 mSv NASA limit → 40 mSv margin (6.7%)
- **Mass boundary EP01**: actual vs 299t limit
- **Mass boundary EP03**: actual vs 452.5t limit
- **Shield life EP04**: 14 min available vs 8 min needed → 6 min margin (43%)
- **Chain probability**: 46% overall success

### 3. Tests
- TDD: Unit tests for gauge rendering
- Article content tests for gauge data accuracy
- E2E test for gauge rendering on page
