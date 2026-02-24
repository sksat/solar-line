# Task 128: 耐G超技術の前提を分析に反映

## Status: TODO

## Description
人間の耐Gについて作中でまったく言及がないことから、なんらかの超技術で解決済みの
可能性がある。Task 119の慣性補償仮説をさらに発展させ、耐G制約をSF前提として
分析全体に適用する。

注: Task 119 はすでに慣性補償仮説を探索済み。本タスクはその結果を踏まえ、
「耐Gについて言及がない＝解決済みの前提」をCLAUDE.mdの分析方針に昇格させ、
各エピソード分析で耐G制約を緩和した場合の影響を包括的に評価する。

## Approach
1. CLAUDE.md の SF tolerance / G-tolerance 項目を更新
2. 各エピソードで加速度制約が分析結果に影響する箇所を特定
3. 耐G制約緩和時のパラメータ空間を探索
4. ship-kestrel.json の耐G仮説セクションを更新

## Dependencies
- Task 119 (DONE): 質量の謎の耐G仮説
- CLAUDE.md: Analysis Perspective
- reports/data/summary/ship-kestrel.json

## Origin
人間指示: 「人間の耐Gについてはまったく言及がないので、なんらかの超技術で解決済みの可能性がある」
