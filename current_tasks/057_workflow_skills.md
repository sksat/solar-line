# Task 057: Workflow Skills

## Status: DONE

## Motivation
Human directive: よくやるような作業パターンは skill 化しておくとよい。

## Scope
1. Identify common workflow patterns in the project
2. Create Claude Code Skills for:
   - Episode analysis (new episode → full pipeline)
   - Subtitle extraction (video ID → extracted lines)
   - Report quality review
   - Cross-episode consistency check
3. Follow Anthropic best practices for Skill definition
4. Place skills in `.claude/skills/`

## Created Skills

| Skill | Path | Description |
|-------|------|-------------|
| `episode-analysis` | `.claude/skills/episode-analysis/SKILL.md` | Full 4-phase pipeline: data collection → analysis → report → validation |
| `subtitle-extraction` | `.claude/skills/subtitle-extraction/SKILL.md` | YouTube VTT + Whisper STT + dialogue extraction |
| `report-review` | `.claude/skills/report-review/SKILL.md` | 6-category quality checklist (data, Japanese, mechanics, structure, nav, build) |
| `cost-analysis` | `.claude/skills/cost-analysis/SKILL.md` | ccusage integration for token/cost analysis |

All skills incorporate efficiency guidelines from Task 066 (background long commands, Haiku subagents, etc.).
