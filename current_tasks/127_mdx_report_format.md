# Task 127: レポートをMDX的に記述してレビューしやすくする

## Status: TODO

## Description
現在のレポートはJSONデータとHTMLテンプレートで構成されているが、
MDXないしMDX的な記述方法を導入することで、レビュー時の可読性を向上させる。
JSONにHTML/マークダウン混在のテキストフィールドがあるのはレビューしにくいため、
よりコンテンツに集中できるフォーマットを検討する。

## Approach
1. 現在のレポートJSON構造の問題点を分析（レビューのしにくさ）
2. MDXまたはMDX的なアプローチの選択肢を検討:
   - a) JSON → MDXへの完全移行
   - b) JSONフロントマター + Markdownボディのハイブリッド
   - c) カスタムMarkdown拡張（既存テンプレートシステムとの統合）
3. nice-friend でアーキテクチャレビュー
4. プロトタイプ実装
5. 既存レポートの移行パス策定

## Dependencies
- ts/src/report-types.ts
- ts/src/templates.ts
- ts/src/build.ts
- reports/data/episodes/*.json
- reports/data/summary/*.json

## Origin
人間指示: 「レポートは mdx ないし mdx 的に記述するとレビューがよりしやすくなる」
