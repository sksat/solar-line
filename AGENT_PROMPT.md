Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, and push to origin.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（反映済みのものは削除すること）
---
- 単純なタスクは sonnet などにやってもらうことによってレイテンシやコストをケチること。ただしレビューは行い、どんなタスクは任せられるかの基準を設定し適宜更新すること。
- rustdoc などもビルドしてデプロイに含めること
- ログなどの日時は JST で管理すること
- コードを引用するときは syntax highlight させたい
- ToDoWrite みたいな、Claude Code 特有のログは Claude Code 見てる時みたいにいいかんじに表示したい