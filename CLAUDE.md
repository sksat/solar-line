# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SOLAR LINE 考察 — astrodynamics analysis of the SF anime series "SOLAR LINE" from『良いソフトウェアトーク劇場』by ゆえぴこ.

Goal: Analyze the validity of ΔV calculations and orbital transfers depicted in the series. Where depictions are plausible, determine the conditions (celestial body positions, pre-burn orbits, timing) that make them work.

Results are published as interactive reports on GitHub Pages, including Claude Code session logs and per-transfer analysis.

## Development Methodology

TDD: Write specs as tests first. All tests must pass in CI at all times.

This project runs via an autonomous Claude Code agent loop inside a VM (following the pattern from https://www.anthropic.com/engineering/building-c-compiler).

**Session handoff is critical.** Each session should:
1. Check `current_tasks/` for unclaimed tasks and claim one by creating/updating a file there
2. Work on one focused problem — don't try to solve everything in a single session
3. Record new ideas in `ideas/`
4. Write clear commit messages that serve as handoff notes to the next session

Use `nice-friend` skill (Codex consultation) when making design decisions or when a second opinion would improve quality.

**Bootstrap (if `current_tasks/` is empty):** Create initial tasks based on DESIGN.md.

## Technology Stack

- **Rust**: Orbital mechanics analysis. Compile to WASM for browser-reproducible reports.
- **TypeScript**: Scripting, data collection, report generation.
- **CI**: GitHub Actions. Check CI status regularly to catch regressions.
- **Output**: GitHub Pages with session logs and interactive orbital transfer reports.

## Data Handling

- Raw data (video files, raw transcripts) is gitignored — never commit these
- Raw data should be placed under `raw_data/` within the workspace (already gitignored)
- YouTube subtitle data is collected via scripts; ニコニコ動画 comments are NOT subtitles
- Dialogue attribution (who said what) requires contextual understanding of characters and scene changes — do not fully automate this; use Claude/Codex to verify speaker identity
- **Two-phase dialogue pipeline:**
  - Phase 1 (Extraction): Extract raw dialogue lines with timestamps from subtitles → `epXX_lines.json` (automated)
  - Phase 2 (Attribution): Assign speakers using context → `epXX_dialogue.json` (context-assisted, NOT fully automated)
  - Keeping these in separate files means re-running extraction doesn't lose attribution work
- Timestamp accuracy matters — cross-reference multiple subtitle tracks where available
- Properly cite all referenced material

## Reports

- **All reports published to GitHub Pages must be written in Japanese (日本語)**
- Reports include per-transfer analysis and session logs
- Session logs should be collected from Claude Code conversation logs (not just stdout)
- Not everything needs to be interactive — include static analysis graphs/charts in reports where appropriate
- Each episode report should embed the YouTube and Niconico video at the top (use a video card component)
- Quote character dialogue with timestamps in analysis, e.g. きりたん「~~~」(10:05)

## Key Principles

- **Document assumptions.** Every analysis depends on assumptions about parameters, data sources, and orbital conditions. Make these explicit in code comments and reports.
- **Don't trust unverified data.** Only original source material and parameters from verified institutions are reliable. Everything else must be cross-checked.
- **Structure for traceability.** Build code and reports so that assumptions and data provenance are easy to inspect.

---
## 人間からの一時的な指示（反映待ち）

- ケストレルの性能評価の根拠が無い
- 分析をする際は、何かひとつでも誤りがあったら諦めるのではなく、複数のパターンを想定してどのパラメータがどうであったら成立するか、といったことを議論するべき。これは基本方針に追加。
