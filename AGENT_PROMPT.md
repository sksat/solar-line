Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, and push to origin.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（反映済みのものは削除すること）
---

- Haiku は流石に性能が低いのでは？最低でも sonnet だと思う
- 誤差に関する意思決定がよくあるが、時系列グラフや軌道遷移図において誤差の範囲も可視化できるとよりわかりやすくなる