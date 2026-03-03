Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, push to origin, check CI status.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（新しい記述を見逃さないようにするため、削除前に git diff を再確認すること。）

---

- 3D 可視化について
  - 公転面が地球と土星とかでめちゃめちゃズレていて何かがおかしい
  - アニメーション速度の設定を可変にしたい
  - 全航路での慣性中心表示の時は惑星などのサイズは強調表示したい
  - 航路の矢印が実際の宇宙船の移動とズレてそう