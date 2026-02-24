# Task 090: Cost Analysis — Non-Max-Subscription Estimates

## Status: TODO

## Motivation

Human directive: コスト分析においては、実際はmax subscriptionでもそうでなかった場合のコスト見積もりもすること

## Scope

Extend the existing cost analysis (ai-costs.json) to include:
1. **Actual Max Plan costs** (current analysis)
2. **Pro Plan estimate**: If using Claude Pro ($20/mo) — what would the token costs be at API rates?
3. **API-only estimate**: Pure API pricing without subscription
4. **Team Plan estimate**: If using Claude Team ($30/seat/mo)
5. Compare cost-effectiveness across plans

### Approach
- Use existing token counts from ccusage analysis
- Apply different pricing tiers:
  - Max subscription: flat rate
  - Pro: rate-limited, may not support all features
  - API: input/output/cache pricing per model
  - Team: per-seat with shared limits
- Calculate hypothetical costs for the full project
- Update ai-costs.json with comparison section

## Dependencies
- Task 066 (cost analysis foundation — DONE)
- Task 077 (cost analysis page — DONE)
