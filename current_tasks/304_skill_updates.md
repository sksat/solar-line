# Task 304: Update Skills with Current Project State

## Status: DONE

## Description
Update Claude Code skills to reflect the current project state. Several skills have stale references:

### episode-analysis
- `.json` → `.md` (MDX migration, Task 186-187)
- Epoch `2240` → `2215` (Task 264)
- "Prefer Haiku subagents" → "Prefer Sonnet subagents" (CLAUDE.md policy)
- Whisper model: `medium` → `large-v3-turbo` (Task 285)

### report-review
- `.json` references → `.md` (MDX migration)

### subtitle-extraction
- Whisper model recommendation: `medium` → `large-v3-turbo` (Task 285)
- Add video-ocr as an additional extraction method (Task 289)

### Housekeeping
- Mark cost_efficiency_analysis.md as RESOLVED (recommendations incorporated into CLAUDE.md)
