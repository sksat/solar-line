# Task 016: ΔV比較カードのテキスト溢れ修正

## Status: DONE

## Problem
ΔV比較やその他のカードで文字列がカードから溢れて見切れてしまうことがある。
TDD で修正すること（人間からの指示）。

## Scope
- `renderBarChart`: SVG内のラベルが長い場合の切り詰め（labelWidthが固定160pxだが日本語ラベルは長くなりがち）
- `renderTransferCard`: ΔV比較テキストが長い場合のoverflowハンドリング
- `renderExploration`: scenario-tableの各セルが長い場合のoverflow
- CSSの `.card` にoverflow対策が必要

## Approach
1. テストを書いて問題を再現する（どの関数・CSSが原因か特定）
2. SVGのlabelWidth計算をテキスト長に応じて調整、またはCSSでword-break/text-overflowを設定
3. テストが通ることを確認

## Depends on
- Templates: `ts/src/templates.ts`
- CSS: `REPORT_CSS` in templates.ts
