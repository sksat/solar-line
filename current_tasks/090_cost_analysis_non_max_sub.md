# Task 090: Cost Analysis — Non-Max-Subscription Estimates

## Status: DONE

## Motivation

Human directive: コスト分析においては、実際はmax subscriptionでもそうでなかった場合のコスト見積もりもすること

## Completed

Added "プラン別コスト比較" section to ai-costs.json with:

### Plans compared
1. **Max Plan ($100-200/mo)**: ~$7 per VM boot (Haiku subagent API only)
2. **API-only**: ~$196 per VM boot (all tokens at API rates)
3. **Batch API**: ~$195 (50% I/O discount, non-interactive only)
4. **Pro Plan ($20/mo)**: Rate-limited, not practical for agent loop

### Key findings
- **Cache is critical**: 97.3% cache hit rate reduces Opus effective rate to $0.50/MTok (10% of base)
- **Max Plan ROI**: $100-200/mo subscription vs ~$196 API cost — pays for itself in one VM boot
- **Per-session cost**: $3.39 (API) vs $0.12 (Max) — 28× difference
- **Opus dominates cost**: Main session Opus tokens (260M) account for 89% of API cost

### Pricing sources
- Official API pricing from platform.claude.com/docs/en/about-claude/pricing (Feb 2026)
- Opus 4.6: $5/$25/MTok (input/output), $0.50 cache read, $6.25 cache write
- Haiku 4.5: $1/$5/MTok, $0.10 cache read, $1.25 cache write
