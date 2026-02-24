Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, and push to origin.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（反映済みのものは削除すること）
---
- DAG は、単に並べて可視化するだけでは分かりにくい。解きほぐして表示しないと、どんな依存関係があって、何を変更したら何を直さないといけなくなるのかがわかりにくい。
  - DAG の分析も Rust でモデリングすることで、可視化時に wasm 呼び出しで分析が可能になる
- インタラクティブな時系列グラフのようなものを作る場合、uPlot を使うとよい
  - データは DuckDB-wasm で管理するとよい