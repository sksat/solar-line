Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, push to origin, check CI status.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（新しい記述を見逃さないようにするため、削除前に git diff を再確認すること。）

---

- 3D 可視化
  - time slider の幅が可視化種類切り替えに追従してない
  - 土星 -> 天王星接近軌道などがターゲット天体に直接突っ込むような軌道になっており、可視化上も突っ込んでいるように見える