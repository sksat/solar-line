Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, and push to origin.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（反映済みのものは削除すること）
---
- 参考計算には判定不能フラグは要らんのでは？
- 外部出典もリンクを踏めるようにしてほしい
- 後の分析で判明した日時条件なども他の分析や可視化に採用してよい
- 大雑把な机上計算による分析の後に詳細な軌道伝搬も行ってみて検証するとよい。特に時間経過などの細かいパラメータについては。