# Task 106: 他船舶分析と太陽系インフラの分離

## Status: IN_PROGRESS

## Motivation

人間の指示: 「他船舶の分析と太陽系インフラの記事は分けた方がよさそう。他船舶の分析は軌道遷移も込みで分析したい。各話分析などにも反映できるとよい。」

現在の `infrastructure.json` は、他船舶（保安艦隊、大型船など）と太陽系インフラ（ステーション、航路誘導網、ガバナンス機構）が1つのレポートに混在している。

## Scope

1. `infrastructure.json` を2つに分離:
   - `other-ships.json`: 他船舶の分析（保安艦隊、大型船、保安艇、商船群）
     - 各船舶の軌道遷移分析を含む（Saturn→Titania 33h のΔV≥58 km/s など）
     - OrbitalDiagram を追加して遷移を可視化
   - `infrastructure.json`: 太陽系インフラ（ステーション、航路誘導網、ガバナンス機構）
2. 他船舶の軌道遷移分析を各話分析にも反映（ep02, ep04, ep05 に関連引用追加）
3. ナビゲーション更新（総合分析ドロップダウンに2つのエントリ）
4. DAG ノードの更新（report.infrastructure → report.infrastructure + report.other-ships）

## Dependencies

- Task 087 (infrastructure analysis) — DONE
- Task 080 (nav dropdowns) — DONE
