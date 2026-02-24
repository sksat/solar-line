---
name: cost-analysis
description: Analyze Claude Code session costs using ccusage. Shows token distribution, per-model breakdown, cache efficiency, and optimization recommendations.
argument-hint: [session|daily|auto]
---

# Cost Analysis

Analyze Claude Code token usage and costs for the SOLAR LINE project.

## Quick Usage

### Auto-detect (requires bun + ccusage):
```bash
cd ts && node --experimental-strip-types src/analyze-costs.ts --mode auto
```

### Manual with ccusage pipe:
```bash
export PATH="$HOME/.bun/bin:$PATH"
bunx ccusage@17 session --offline --json --timezone Asia/Tokyo | \
  node --experimental-strip-types ts/src/analyze-costs.ts --mode session
```

### Daily summary:
```bash
export PATH="$HOME/.bun/bin:$PATH"
bunx ccusage@17 daily --offline --json --timezone Asia/Tokyo | \
  node --experimental-strip-types ts/src/analyze-costs.ts --mode daily
```

## What It Reports

1. **Token Distribution**: Input, output, cache creation, cache read breakdown
2. **Per-Model Costs**: Opus, Sonnet, Haiku token and cost breakdown
3. **Session Efficiency**: Main vs subagent costs, expensive sessions, cache hit rates
4. **Recommendations**: Actionable suggestions for reducing context waste

## Key Metrics to Watch

| Metric | Good | Needs Attention |
|--------|------|----------------|
| Cache hit rate | >95% | <90% |
| TodoWrite % of calls | <5% | >10% |
| Subagent avg tokens | <500K | >1M |
| Max session size | <2MB | >3MB |

## Installation Note

ccusage v18+ requires the `runtime:` protocol (bun-native). Use v17:
```bash
bunx ccusage@17 [command] --offline --json
```

If bun is not installed:
```bash
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
```

## See Also

- `ideas/cost_efficiency_analysis.md` — Full analysis write-up
- CLAUDE.md "Context Efficiency" section — Operational guidelines
