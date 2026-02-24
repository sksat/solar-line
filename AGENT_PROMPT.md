Check current_tasks/ for an unclaimed task. If empty, create initial tasks based on DESIGN.md.
Claim a task, work on it, commit your changes, and push to origin.

人間からの新たな指示があれば一時的に以下に書く。
ここに書く一時的な指示を認識したらまずこのファイルを commit し、タスク化したり Design Doc に反映したら追加内容を削除して commit することで、人間からの指示を git history に残すこと。
以下追加指示（反映済みのものは削除すること）
---

- Rust の依存ライブラリに関して。wasm ビルドするので、no_std 対応している nalgebra のようなものは使ってよい。
  - 計算の精度などの確からしさの確認のため、信頼できる実装をオラクルとしたテストを組むとよい。それにより、計算内容は保証しつつ、wasm ビルドできるシンプルな構成を維持することができる。
- current_tasks や ADR などの内部ドキュメントもサイト上で見られるようにしたい
- ADR には alternative などのセクションも欲しい。意思決定を後で変更する際に、どんな前提で意思決定が行われ、他にどんな選択肢があったのかの記録が重要になる。
- 軌道遷移図には、タイトルだけでなくなんのためのどんな分析で、そこから何が読み取れるのかといった description も入れられるとよい
- また CI がコケてる。ほぼ常に CI pass を維持できるようなワークフローにしたい。