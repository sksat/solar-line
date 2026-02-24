Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, and push to origin.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（反映済みのものは削除すること）
---
- タスクや分析の DAG を管理する構造を作っておくこと。そうすれば、前提部分を見直した時に再度やり直さないといけなくなる部分や、何かを疑った時にその前提も疑い直さないといけないのかなどが判断しやすくなる。
  - この DAG は過去のログも残しておくこと。現在状態とログをファイルに残しておき、それを操作するユーティリティを作っておくと管理がしやすいはず。これを作るより前のログについては、session log や commit log を見返すことで再構成すること。
  - Task DAG のログをアニメーション表示できるようなものを技術解説に入れたい
- 各種意思決定を ADR として残しておくこと。そうすると、どんなポリシーで設計や分析をするのかを見失いにくい。
  - 過去の意思決定も session log や commit log から発掘すること