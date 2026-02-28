Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, and push to origin.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（新しい記述を見逃さないようにするため、削除前に git diff を再確認すること。）

---

- 軌道遷移図において、一部の天体だけが動いているケースがあって不自然。TDD で修正。
- タイタニア出発の軌道遷移図で、天王星表面に落下しているように見える。シミュレーションの想定がおかしいのでは？
- アニメーションを含め、各分析の可視化結果も含めてエージェントがレビューしやすい構造を作っておきたい