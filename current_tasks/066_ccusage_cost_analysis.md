# Task 066: ccusage Cost Analysis and Efficiency Optimization

**Status:** DONE
**Priority:** HIGH (human directive)

## Objective

Use ccusage to analyze per-analysis and overall costs for the SOLAR LINE project.
Identify where context is being wasted due to tool characteristics, and propose/implement
efficiency improvements (skills, wrappers, workflow changes).

## Human Directive

> ccusage を使って、各分析や全体でどのくらいのコストがかかったかを分析してほしい。
> また、これを用いることで分析の効率をある程度見積もることができるはず。
> 問題や分析の特性上仕方ないものについては仕方ないが、ツールの特性などによって
> 不当にコンテキストを無駄遣いしている場合などは skill 化やラッパーの開発によって
> コンテキストを節約して効率化が可能なはず。

## Deliverables

1. **Analysis script** (`ts/src/analyze-costs.ts`): Parses ccusage JSON output, correlates
   with git history, generates per-task cost estimates
2. **Cost report** (in `reports/` or `ideas/`): Per-task and per-episode cost breakdown,
   efficiency metrics, recommendations
3. **Efficiency recommendations**: Concrete proposals for skills/wrappers to reduce context waste
4. **Update CLAUDE.md**: Add efficiency guidelines if warranted

## Analysis Findings (This VM Session)

### Token Distribution
- Total tokens: 359M (97.3% cache reads)
- Actual I/O: 0.04% of total tokens
- Cost: ~$6.57 (mostly from Haiku subagents)

### Tool Usage (4,675 calls across 58 sessions)
- Bash: 1,375 (29.4%) — builds, tests, git, yt-dlp, whisper
- Read: 1,156 (24.7%) — file contents
- Edit: 890 (19.0%) — file modifications
- TodoWrite: 459 (9.8%) — task tracking
- Grep: 243 (5.2%) — content search
- Write: 240 (5.1%) — new files
- Task: 119 (2.5%) — sub-agent delegation
- WebSearch: 55 (1.2%)
- WebFetch: 40 (0.9%)
- Glob: 40 (0.9%)
- Skill: 34 (0.7%)

### Subagent Analysis (120 subagents)
- 87.4% of subagent tokens are cache reads
- Haiku: 79% of messages, 72% of tokens
- Sonnet: 11% of messages, 21% of tokens (most expensive per call)
- Read-only: 87.5% of tool calls are Read or Bash
- Most expensive subagent: Sonnet report reviewer (8.4M tokens, 9m44s, 95 tool calls)

### Key Efficiency Observations

1. **TodoWrite overhead**: 459 calls (9.8%) — each call sends full todo list in context.
   Consider reducing update frequency.
2. **Bash-heavy subagents**: 43% of subagent tool calls are Bash. Some of these could be
   replaced with Read/Grep for lower context overhead.
3. **Sonnet subagents are expensive**: 2x cost per message vs Haiku. Use Haiku for
   simple exploration tasks, reserve Sonnet for complex review.
4. **Long-running Bash streams**: The largest session (5,240 lines) was 91% bash_progress
   from Whisper/yt-dlp. Consider running these as background tasks.

## Limitations

- ccusage only accesses JSONL files on the current machine
- This VM only has today's sessions (the full project history is across many VMs)
- For comprehensive analysis, the human should run ccusage locally where all session
  data resides, or aggregate session logs
