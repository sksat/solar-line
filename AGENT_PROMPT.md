Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, and push to origin.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（新しい記述を見逃さないようにするため、削除前に git diff を再確認すること。）

---

- 単に記事の存在をチェックするのみのテストにはあまり意味が無い。Web ページとしての成立性検証（レンダリングが正しく行われているか、リンク先が機能しているか、など）と記事そのもののテストは論理的に意味が異なるもの。特に後者についてはテストの仕組みを既存のツール（Playwright など）に乗っかりにくいため、このプロジェクト内でメンテナンスする必要がある。その中で、記事内の検証を「テスト」として扱い、それによる TDD 的アプローチによる記事編集・自動テストによる記事の内容が検証されている状態の維持を行う。