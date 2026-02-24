Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, and push to origin.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（反映済みのものは削除すること。新しい記述を見逃さないようにするため、削除前に git diff を再確認すること。）
---

- コールドスリープについては、作中で明示的に言及されている以上、明示的な場面以外で行われないはず
- レポートは mdx ないし mdx 的に記述するとレビューがよりしやすくなる
- 人間の耐Gについてはまったく言及がないので、なんらかの超技術で解決済みの可能性がある
  - 船の構造部分と居住区画は分けて考えるべき
- プロジェクトオーナーの承認が必要な判断は、未承認の ADR という形で明らかにすること
- この考証のほとんどが AI 生成であることと、ネタバレ注意を最初に強く明示すること