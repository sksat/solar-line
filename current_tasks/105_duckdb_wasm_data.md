# Task 105: DuckDB-WASM によるデータ管理基盤

## Status: TODO

## Motivation

Human directive: データは DuckDB-wasm で管理するとよい。

## Scope

1. **DuckDB-WASM 導入**:
   - CDN で @duckdb/duckdb-wasm をロード
   - ブラウザ上でのデータクエリ基盤を構築

2. **データのロード**:
   - 既存の JSON データ（episodes, summary, DAG state）を DuckDB テーブルとしてロード
   - Parquet エクスポートの検討（ビルド時に JSON → Parquet 変換）

3. **クエリ UI**:
   - レポートページで SQL クエリによるデータ探索を可能にする
   - 例: SELECT * FROM transfers WHERE dv_km_s > 10 ORDER BY episode
   - uPlot との連携: クエリ結果を直接グラフ化

4. **DAG との統合** (Task 103 連携):
   - DAG ノード・エッジを DuckDB テーブルとして管理
   - SQL でグラフクエリ（再帰 CTE で依存チェーン探索）

## Dependencies
- Task 103 (DAG Rust analysis) と連携
- Task 104 (uPlot) と連携

## Notes
- DuckDB-WASM はブラウザ内で動作する分析用 RDBMS
- 大量データの集計・フィルタリングに強い
- JSON データを直接読める (read_json_auto)
- 既存のビルドパイプラインとの統合を検討
