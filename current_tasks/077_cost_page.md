# Task 077: AIコストをページから確認可能に

## Status: DONE

## Motivation

Human directive: 「AI コストをページから確認できない」

## Implementation

- Created `reports/data/summary/ai-costs.json` — SummaryReport with 5 sections
- Sections: 概要, トークン分布, コスト内訳, 効率化施策, プロジェクト全体のコスト見積もり
- Auto-discovered by discoverSummaries() and linked in site navigation
- Key metrics: 97.3% cache hit rate, $6.57 Haiku cost, 360M tokens per VM boot
- Accessible from site nav at summary/ai-costs.html
