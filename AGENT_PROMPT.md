Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, and push to origin.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（反映済みのものは削除すること）
---
- Pages で GitHub repo を明示すること
- Anthropic 公式の skill は使ってよい。frontend-skill など。
- Claude Code session log は agent-loop の標準出力のサマリー的なやつと conversion log は分けて表示すること。また、後者では アシスタントは Assistant (model) のように表記すること。sub-agent などにもできれば対応したい。どの commit と紐付いているかもできれば明示し、GitHub にリンクされていてほしい。
- 各分析は SOLAR LINE をあまり知らない人や、見たけど軌道力学には詳しくない人にも伝わるようなものになっているかという観点でたまにレビューするとよい。ただし、詳細な分析が主目的なので、平易になりすぎても仕方ないことに注意すること。
- 画面からの分析を行った場合はそのスクリーンショットを引用してもよい。ただし引用の要件を満たすため、やりすぎには注意すること。
- 軌道伝搬においては、数値積分手法の精度の見積りおよび検証も行いながら、それをテストとして TDD を行うこと。検証は主に系全体でのエネルギー保存などを指標にするとよい。
- どのタイミングで人間からどんな追加指示があったかを1枚のファイルにまとめておくようにしておいてほしい