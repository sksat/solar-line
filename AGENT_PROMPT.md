Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, and push to origin.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（反映済みのものは削除すること）
===

- 台詞の話者判定が誤っている。話者判定は全自動でやるのではなく、なんらかの手段で話者分離ができていたとしても、その後の判定は文脈を元に行うこと。そのため、発言の抽出とその発言への話者の振り分けは別フェーズのように行うこと。ファイルも分けておくとよい。そうすると、台詞抽出を再度走らせた後にも対応しやすいはず。
- 台詞の時間判定もあんまり正確じゃないように見える。できればどうにかしたい。