Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, and push to origin.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（反映済みのものは削除すること）
---
- YouTube vtt の精度はそこまで高くないのであくまでデータソースのひとつとして扱う。字幕の OCR や Speech to text のための仕組みも作っておくとよいでしょう。
- 軌道遷移は惑星軌道と天体と遷移軌道を描いたグラフとかがあるとわかりやすい。