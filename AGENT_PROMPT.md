Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, and push to origin.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（反映済みのものは削除すること）
---
- 文字起こしのページは、複数のデータソースの生の表示と、文脈から文字や話者を修正したものをそれぞれ選択可能にしたい
- ライなんて人いたっけ
- レスポンシブ対応したい
- ケイは物語的に人間として描写されているのでケイと表記したい
- README なども適宜更新してほしい
- ヘッダーが多くなって視認性が低くなってきたのでどうにかしたい
- CI がコケてる
  - CI でやっているような検証のうち、対して時間がかからないものや、その時の変更範囲内のものがすぐ確認できる時は commit 前などに自分でも検証すること