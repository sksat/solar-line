# Task 009: Subtitle Collection & Speaker Attribution

## Status: TODO

## Goal
Collect subtitle data for available episodes and perform speaker attribution to build an attributed dialogue dataset for analysis.

## Depends on
- Task 004 (subtitle collection pipeline)

## Scope
1. Collect subtitles for Episode 1+ using collect-subtitles script
2. Apply speaker attribution using Claude/Codex for disambiguation
3. Annotate orbital mechanics mentions (OrbitalMention)
4. Commit attributed data (raw data stays gitignored)
5. Cross-reference dialogue with analysis findings

## Notes
- Speaker attribution requires contextual understanding — use nice-friend for verification
- Scene breaks need careful identification from context clues
- This enriches existing episode analyses with actual dialogue citations
