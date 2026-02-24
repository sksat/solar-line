Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, and push to origin.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（反映済みのものは削除すること。新しい記述を見逃さないようにするため、削除前に git diff を再確認すること。）
---
- 再現コマンドは、レポートに対してひとつではなく、各解析に対してひとつ作っておく。それをテストのように扱うことで、TDD 的に解析を行うことができる。また、自動テストのように、常に解析されている状態を維持する。それによって、前提条件が変わった際に DAG を確認するよりも確実に再度解析を行うことができる。