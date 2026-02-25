# Task 186: Episode Report MDX Migration (EP01 Pilot)

## Status: DONE

## Description

Migrate episode reports from JSON to MDX-like format for improved reviewability. JSON with embedded HTML/markdown is hard to review — MDX allows reviewers to focus on the analysis text. Start with EP01 as a pilot.

Summary reports were migrated in Task 175. Episode reports (5125 lines of JSON across 5 episodes) remain in the old format. The goal is to move the **prose content** (transfer explanations, verdict summaries, exploration summaries) to readable markdown while keeping structured data (parameters, sources, numeric values) as JSON directives.

## Design (per Codex consultation)

**Hybrid approach (Option C)**: Separate episode MDX parser/assembler.

### File format: `ep01.md`

```markdown
---
episode: 1
title: "SOLAR LINE Part 1 — 火星からガニメデへ"
summary: "きりたんが小型貨物船..."
---

```video-cards:
[{ "provider": "niconico", "id": "sm45280425", ... }, ...]
```

```dialogue-quotes:
[{ "id": "ep01-quote-01", "speaker": "ケイ", ... }, ...]
```

## ep01-transfer-01

ホーマン遷移基準値: 火星軌道 → 木星軌道（最小エネルギー）

```transfer:
{ "id": "ep01-transfer-01", "timestamp": "該当なし（参考計算）", ... }
```

古典的ホーマン遷移には合計約10.15 km/sのΔVが必要だが...
(explanation prose in natural markdown)

## ep01-transfer-02

(next transfer...)
```

### Key principles:
1. **Separate parser**: `episode-mdx-parser.ts`, NOT extending mdx-parser.ts
2. **Sections keyed by transfer ID**: `## ep01-transfer-XX` headings map to transfers
3. **Explanation as section markdown**: Section text below the `transfer:` directive becomes `TransferAnalysis.explanation`
4. **Frontmatter scalar only**: Current YAML parser handles scalars; arrays go in directives
5. **Output**: Parser produces `EpisodeReport` objects — existing renderEpisode() unchanged
6. **Exploration sections**: `### ep01-exp-XX` within transfer sections
7. **Report-level arrays**: `diagrams:`, `timeseries:`, `detail-pages:` as top-level directives (before first ## or in a dedicated section)

### Build pipeline changes:
- `discoverEpisodes()` in build.ts: also look for `ep\d+\.md` files
- Conflict check: throw if both .json and .md exist for same episode

## Scope (this task)
1. Write episode MDX parser with TDD
2. Update build.ts to discover .md episode files
3. Convert ep01.json → ep01.md
4. Verify all existing tests still pass (including data validation)
5. Delete ep01.json after successful migration

## Dependencies
- MDX parser infrastructure (mdx-parser.ts, Task 127/175)
- EP01 report data (ep01.json)

## Future (separate tasks)
- EP02-EP05 migration
- Exploration directive support
- detailPages directive support
