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
- **YouTube VTT (auto-generated subtitles) accuracy is limited** — especially for VOICEROID/software-talk content. Treat VTT as one data source among many; build OCR and speech-to-text infrastructure as additional subtitle sources
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
- **Orbital transfer diagrams**: Include graphs showing planetary orbits, celestial body positions, and transfer trajectories to make the analysis more visually understandable
- Each episode report should embed the YouTube and Niconico video at the top (use a video card component)
- Quote character dialogue with timestamps in analysis, e.g. きりたん「~~~」(10:05)
- **Dialogue citations should be natural** — don't create a separate "evidence quotes" section that feels intrusive. Weave quotes naturally into the analysis text.
- **Nested analysis structure**: Each transfer analysis (problem) should contain its related parameter explorations (scenarios) as nested sub-sections, not as separate flat sections
- **Scenario ordering**: Present the most plausible scenario first, then alternatives. Collapse implausible scenarios by default (use `<details>`)
- **Terminology**: Prefer "brachistochrone" (English/formula notation) over カタカナ「ブラキストクローネ」 — the latter is rarely used in Japanese technical writing
- **Interactive orbital diagrams**: Add time slider to animate orbital transfers, showing how celestial body positions change during the transfer
- **Report review**: Periodically have other Claude Code sessions or Codex review reports for readability/clarity
- **VTT/transcription accuracy**: VTT and other transcriptions are not always perfect — correct text from context when actually using it in reports
- **Report navigation**: Source citations must be clickable links. Reports should link to other episode reports and summary pages. Use section anchors and a table of contents for intra-page navigation.

## Key Principles

- **Document assumptions.** Every analysis depends on assumptions about parameters, data sources, and orbital conditions. Make these explicit in code comments and reports.
- **Don't trust unverified data.** Only original source material and parameters from verified institutions are reliable. Everything else must be cross-checked.
- **Structure for traceability.** Build code and reports so that assumptions and data provenance are easy to inspect.
- **Explore multiple scenarios.** When an analysis finds a discrepancy, do not simply conclude "implausible" and stop. Instead, explore multiple parameter variations: what mass, thrust, trajectory, or timing would make the depicted scenario work? Discuss boundary conditions and plausible interpretations. The goal is to map the space of possibilities, not to render a single verdict.
- **Cite evidence for all claims.** Ship specs, orbital parameters, and other values used in analysis must cite their source (episode timestamp, worldbuilding document URL, etc.). Unsourced parameters undermine the analysis.
- **Cross-episode consistency.** Analyze consistency across episodes — e.g., do ship specs, mass assumptions, or orbital parameters used in one episode agree with those in another? Flag and discuss discrepancies.
