# Task 122: インタラクティブ要素のE2Eテスト基盤

## Status: TODO

## Description
uPlot チャート、軌道アニメーション、DAGビューア等のインタラクティブ要素について、
各ライブラリ部分にexampleページを用意し、PlaywrightでE2Eテストを行える基盤を構築する。

## Approach
1. examples/ ディレクトリに各コンポーネントのスタンドアロンHTMLを作成
   - uPlot chart example
   - Orbital animation example
   - DAG viewer example
   - Bar chart example
2. Playwright テスト環境のセットアップ
3. 各 example に対する E2E テストの記述
   - レンダリング確認
   - インタラクション確認（スライダー操作、ホバーツールチップ等）
4. CI に E2E テストを追加

## Dependencies
- ts/src/orbital-animation.js
- ts/src/calculator.js
- ts/src/dag-viewer.js
- 既存 Playwright E2E テストがあれば参照

## Origin
人間指示: 「インタラクティブな要素は、ライブラリ部分は example を用意して、その example に対して Playwright などで E2E test を組むことで、unit test 的な検証を可能にするとよい」
