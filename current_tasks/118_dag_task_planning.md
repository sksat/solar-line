# Task 118: DAG を用いたタスク計画と並列実行管理

## Status: TODO

## Motivation

人間の指示: 「DAG は分析のやり直しだけでなく、タスクの依存関係を把握し、どのタスクが Task agent や codex などを用いて並列に実行可能かを見極め、このセッションでは何をやるかを決定するのに用いること。現在作業中の依存関係ツリーにマークができるような仕組みがあるとよいかもしれない。」

現在の DAG はデータ→パラメータ→分析→レポートの分析依存グラフのみモデル化。
タスクの依存関係と並列実行可能性の管理機能が不足。

## Scope

1. DAG にタスクノード（type: "task"）を追加し、current_tasks/ のタスクを反映
2. タスク間の依存関係を DAG のエッジとしてモデル化
3. "active" ステータスの追加（valid/stale/pending に加えて active/blocked）
4. CLI コマンド追加:
   - `npm run dag -- plan`: 実行可能なタスク一覧（依存がすべて完了、未着手）
   - `npm run dag -- claim <id>`: タスクを active にマーク
   - `npm run dag -- parallel`: 並列実行可能なタスクグループを表示
5. DAG Viewer で active ノードを視覚的にハイライト
6. セッション開始時に `dag plan` を実行して作業対象を決定するワークフロー

## Dependencies

- Task 085 (DAG management) — DONE
- Task 088 (DAG improvements) — DONE
- Task 103 (DAG Rust analysis) — DONE
