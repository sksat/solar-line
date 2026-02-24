Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, and push to origin.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（反映済みのものは削除すること）
---
- 分析の DAG とリポジトリそのものでのタスクや技術開発の DAG は系統を分けて表示すること
- 過去の時点の DAG を遡れるような viewer にすること
- DAG の正しさを確認し必要があれば DAG そのものや中身のツールや意思決定・分析を見直すため、一度すべてをよく見直すこと
- DAG の依存関係を張り替えるような操作もやりやすくしておくこと
- 文字起こしの話者なども全体の文脈も踏まえながら再度見直すこと
- コスト分析においては、実際は max subscription でもそうでなかった場合のコスト見積りもすること
- 作品の描写からして、年単位の航行は違和感がある
  - このような違和感を発見できるレビューを行うようにしたい
