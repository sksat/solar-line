# Task 120: 台詞データID参照方式への移行＋静的検査

## Status: TODO

## Description
現在、レポート内の台詞引用は DialogueQuote 型でテキストを直接埋め込んでいる。
これを文字起こしデータ（epXX_dialogue.json）をマスターとし、IDで参照する方式に移行する。

## Approach
1. 台詞データにユニークIDを付与（episode+scene+index等）
2. レポート内の DialogueQuote をID参照方式に変更（型定義更新）
3. ビルド時にIDを解決してテキスト・タイムスタンプを埋め込む
4. 台詞参照の静的検査スクリプトを作成（壊れたIDの検出）
5. CI に検査を追加
6. 既存の全レポートデータを新方式に移行

## Dependencies
- ts/src/report-types.ts（DialogueQuote型）
- reports/data/episodes/（epXX_dialogue.json）
- ts/src/templates.ts（レンダリング）
- ts/src/build.ts（ビルドパイプライン）

## Origin
人間指示: 「台詞のデータはあくまで文字起こしデータや文字起こしページの方で管理し、台詞の参照はそれをIDなどで参照することで台詞の更新に追従しやすくするとよい。事前に台詞などの参照が途切れていないかを静的検査する仕組みがあるとよりよい。」
