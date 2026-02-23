# Task 009: Subtitle Collection & Speaker Attribution

## Status: IN PROGRESS

## Goal
Collect subtitle data for available episodes and perform speaker attribution to build an attributed dialogue dataset for analysis.

## Depends on
- Task 004 (subtitle collection pipeline)

## Architecture (Human Directive)

**Two-phase pipeline, separate files:**

### Phase 1: Dialogue Extraction (automated)
- Input: Raw subtitle files (from yt-dlp)
- Output: `reports/data/episodes/epXX_lines.json` — raw dialogue lines with timestamps, NO speaker info
- Fully automated: parse subtitles, merge continuation lines, clean formatting
- Timestamp refinement: cross-reference multiple subtitle tracks if available

### Phase 2: Speaker Attribution (context-assisted)
- Input: `epXX_lines.json` + episode context (scene descriptions, character knowledge)
- Output: `reports/data/episodes/epXX_dialogue.json` — full EpisodeDialogue with speakers
- NOT fully automated: Claude/Codex reviews context to assign speakers
- Scene breaks identified from context clues
- Confidence levels (verified/inferred/uncertain) for each attribution

**Rationale:** Separating phases means re-running extraction doesn't lose attribution work. Attribution files can be independently reviewed and corrected.

## Scope
1. Collect subtitles for Episode 1 using collect-subtitles script
2. Implement Phase 1: dialogue line extraction with improved timestamps
3. Implement Phase 2: context-based speaker attribution
4. Generate epXX_lines.json and epXX_dialogue.json
5. Update ep01.json dialogue quotes from attributed data
6. Cross-reference dialogue with analysis findings

## Notes
- Speaker attribution requires contextual understanding — use nice-friend for verification
- Scene breaks need careful identification from context clues
- Timestamp accuracy is a concern — use multiple signals where possible
- This enriches existing episode analyses with actual dialogue citations
