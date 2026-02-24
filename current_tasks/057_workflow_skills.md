# Task 057: Workflow Skills

## Status: TODO

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

## Notes
- nice-friend skill already exists as example
- Skills should encapsulate multi-step workflows
