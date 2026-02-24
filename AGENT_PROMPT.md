Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, and push to origin.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（反映済みのものは削除すること）
---
- ccusage を使って、各分析や全体でどのくらいのコストがかかったかを分析してほしい
  - また、これを用いることで分析の効率をある程度見積もることができるはず。問題や分析の特性上仕方ないものについては仕方ないが、ツールの特性などによって不当にコンテキストを無駄遣いしている場合などは skill 化やラッパーの開発によってコンテキストを節約して効率化が可能なはず。