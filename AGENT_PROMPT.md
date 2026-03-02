Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, push to origin, check CI status.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（新しい記述を見逃さないようにするため、削除前に git diff を再確認すること。）

---

- 3次元的な変化などの可視化は、Three.js などを使って3D drag 可能な可視化にすること。履歴の可視化の場合は2Dの場合と同様にアニメーション可能であるとよりよい。TDD で開発すること。