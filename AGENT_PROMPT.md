Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, and push to origin.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（反映済みのものは削除すること）
---
- markdown の表がよく壊れているので、よくユニットテストしたモジュールを使う、それを E2E test するなどして防いでほしい
- メタな分析として、この分析ページ・リポジトリそのものの技術解説ページもあるとよい
- 動画のタイムスタンプ表示(10:00)みたいなやつは、その時点の動画へのリンクにしてほしい
- CI がコケてるのは優先度高めに直すべき