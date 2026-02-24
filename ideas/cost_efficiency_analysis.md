# Cost Efficiency Analysis — SOLAR LINE Project

## Overview

Analysis of Claude Code token usage patterns across the SOLAR LINE project, based on
ccusage session data from the autonomous agent loop VM.

## Key Metrics (Sample: 1 day, 58 sessions, 120 subagents)

| Metric | Value |
|--------|-------|
| Total tokens | ~360M |
| Total cost (Haiku subagents) | ~$6.57 |
| Main session cost (Opus) | $0 (Max subscription) |
| Cache read ratio | 97.3% |
| Tool calls | 4,675 |
| Subagent invocations | 120 |

## Token Distribution

- **97.3%** cache reads — excellent cache utilization
- **2.7%** cache creation — context setup overhead
- **<0.1%** actual I/O — the "useful work" is a tiny fraction of total tokens

## Cost Drivers

### 1. Subagent spawning (100% of measured cost)
All $6.57 comes from Haiku subagent calls. Each subagent:
- Gets a fresh context with the project's CLAUDE.md, MEMORY.md, and system prompt
- Averages ~836K tokens (mostly cache reads)
- Makes ~16 tool calls
- Most (88%) are read-only exploration

### 2. TodoWrite frequency (9.8% of tool calls)
459 TodoWrite calls across 58 sessions (7.9 per session average). Each call includes
the full todo list in both the request and response, consuming context on every turn.

### 3. Long-running Bash streams
The largest session was 16x the average size due to bash_progress streaming from
Whisper/yt-dlp. These progress lines are stored in the JSONL and inflate context.

### 4. Subagent model selection
- Haiku subagents: 79% of invocations, 72% of tokens, ~$0.05/invocation avg
- Sonnet subagents: 11% of invocations, 21% of tokens, ~$0.02/invocation but more tokens
- Opus subagents: 10% of invocations, 7% of tokens, $0/invocation (subscription)

## Efficiency Recommendations

### High Impact

1. **Reduce TodoWrite frequency**: Update only on state transitions (start/complete), not
   between every tool call. Could save ~200 context turns per day.

2. **Background long Bash commands**: Use `run_in_background` for yt-dlp, Whisper, and
   other long-running processes. Check output later with TaskOutput.

### Medium Impact

3. **Prefer Haiku for exploration subagents**: Most subagent tasks are simple file reading.
   Haiku is sufficient and cheaper.

4. **Prefer Read/Grep over Bash in subagents**: 43% of subagent tool calls are Bash
   (often doing cat/grep/find). The dedicated tools are more structured and efficient.

5. **Limit subagent scope**: Some subagents run 95+ tool calls (9+ minutes). Set
   `max_turns` on Task calls to cap exploration.

### Low Impact, High Value

6. **Skill-ize repeated workflows**: Create Claude Code Skills for:
   - Episode analysis pipeline
   - Report review checklist
   - Subtitle processing (download + transcribe + extract)

7. **Trim MEMORY.md**: Keep under 200 lines. Move detailed content to topic files.
   Currently truncated at 200 lines, wasting some cache creation tokens.

## Cost Estimation Framework

For the full project (~65 tasks, ~94 commits), assuming similar patterns:
- ~58 sessions per VM boot × N boots
- ~120 subagents per boot
- ~$6.50 Haiku cost per boot
- Opus cost: $0 (Max subscription)

The project's cost efficiency is generally **excellent** (97.3% cache hit rate).
The main optimization opportunities are in reducing unnecessary context churn
(TodoWrite) and avoiding inflated sessions from streaming output.

## Running the Analysis

```bash
# In ts/ directory:
# Option 1: Pipe from ccusage
bunx ccusage@17 session --offline --json | npm run analyze-costs -- --mode session

# Option 2: Save and analyze
bunx ccusage@17 session --offline --json > costs.json
npm run analyze-costs -- --mode session --input costs.json

# Option 3: Daily summary
bunx ccusage@17 daily --offline --json | npm run analyze-costs -- --mode daily
```
