Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, and push to origin.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（新しい記述を見逃さないようにするため、削除前に git diff を再確認すること。）
---

- クロスエピソード分析で全124日と表記しておきながらアニメーションのシークバーの横の日付がアニメーション終了時に6d0hになるのはなぜ？軌道遷移図の整合性テストに不足がありそう。
- また、主人公は15日の無の区間を長いと感じている描写があるので、全行程が3桁日になるのは違和感が拭えない。これも制約条件として、適切な惑星配置の日時を探すタスクの再試行とそのためのテストを書くべき。