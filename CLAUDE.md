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

Use `nice-friend` skill (Codex consultation) when making design decisions or when a second opinion would improve quality. Official Anthropic skills (e.g. `frontend-skill`) may also be used.

**Bootstrap (if `current_tasks/` is empty):** Create initial tasks based on DESIGN.md.

## Technology Stack

- **Rust**: Orbital mechanics analysis + DAG graph analysis. Compile to WASM for browser-reproducible reports and interactive analysis.
- **TypeScript**: Scripting, data collection, report generation.
- **uPlot**: Interactive time-series charts (thrust profiles, radiation dose, etc.). Lightweight Canvas-based library.
- **DuckDB-WASM**: Browser-side data management. SQL queries over JSON data, integration with uPlot for query-driven visualization.
- **CI**: GitHub Actions. Check CI status regularly to catch regressions.
- **Pre-commit checks**: Before committing, run quick CI checks locally when relevant (cargo fmt --check, cargo clippy, npm run typecheck). For changes within a specific scope, verify at least the affected checks pass.
- **Output**: GitHub Pages with session logs and interactive orbital transfer reports.

## Data Handling

- Raw data (video files, raw transcripts) is gitignored — never commit these
- Raw data should be placed under `raw_data/` within the workspace (already gitignored)
- YouTube subtitle data is collected via scripts; ニコニコ動画 comments are NOT subtitles
- **YouTube VTT (auto-generated subtitles) accuracy is limited** — especially for VOICEROID/software-talk content. Treat VTT as one data source among many; build OCR and speech-to-text infrastructure as additional subtitle sources
- Dialogue attribution (who said what) requires contextual understanding of characters and scene changes — do not fully automate this; use Claude/Codex to verify speaker identity
- **Primary dialogue partner**: きりたん's main conversation partner is ケイ（ケストレル号の船載AI、物語上は人間として描写）— most dialogue is between these two
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
- When processing session log files, copy them to the workspace directory first for easier reference (applies to both Claude Code and Codex logs)
- Not everything needs to be interactive — include static analysis graphs/charts in reports where appropriate
- **Concrete values need visualization**: When analyzing specific numerical values (ΔV, acceleration, travel time), include charts or diagrams to make the analysis more intuitive
- **Orbital transfer diagrams**: Include graphs showing planetary orbits, celestial body positions, and transfer trajectories to make the analysis more visually understandable
- Each episode report should embed the YouTube and Niconico video at the top (use a video card component)
- Quote character dialogue with timestamps in analysis, e.g. きりたん「~~~」(10:05) — timestamps should be clickable links to the video at that point
- **Markdown tables**: The markdownToHtml converter supports tables (|...|...|). Use E2E tests to catch broken table rendering.
- **Dialogue citations should be natural** — don't create a separate "evidence quotes" section that feels intrusive. Weave quotes naturally into the analysis text.
- **Transcription-report sync**: When transcription corrections are made (speaker names, dialogue text, timestamps), update corresponding dialogue quotes in episode reports. Run validation to check consistency between dialogue data files and report citations.
- **Nested analysis structure**: Each transfer analysis (problem) should contain its related parameter explorations (scenarios) as nested sub-sections, not as separate flat sections
- **Scenario ordering**: Present the most plausible scenario first, then alternatives. Collapse implausible scenarios by default (use `<details>`)
- **Terminology**: Prefer "brachistochrone" (English/formula notation) over カタカナ「ブラキストクローネ」 — the latter is rarely used in Japanese technical writing
- **Interactive orbital diagrams**: Add time slider to animate orbital transfers, showing how celestial body positions change during the transfer
- **Diagrams and graphs for clarity**: Prioritize visual explanations — readers benefit from seeing data rather than just reading numbers. Add comparison charts, parameter space plots, and schematic diagrams wherever they aid understanding. More figures are better than fewer.
- **Report review**: Periodically have other Claude Code sessions or Codex review reports for readability/clarity. Consider whether analyses are accessible to readers unfamiliar with SOLAR LINE or orbital mechanics, while keeping detailed analysis as the primary goal.
- **Screenshot citations**: When video analysis produces findings, screenshots may be cited in reports. Follow fair-use citation requirements — do not overuse.
- **VTT/transcription accuracy**: VTT and other transcriptions are not always perfect — correct text from context when actually using it in reports
- **Report navigation**: Source citations must be clickable links. Reports should link to other episode reports and summary pages. Use section anchors and a table of contents for intra-page navigation.
- **Transcription-report sync**: When transcription corrections change speaker names or dialogue text, update the corresponding dialogue quotes in episode reports (epXX.json) to maintain consistency.

## Analysis Perspective

- **SF tolerance**: This is an SF work — human g-tolerance countermeasures and futuristic propulsion capabilities are acceptable premises. Focus on whether in-story depictions are **narratively consistent** (elapsed time, distances, celestial positions) rather than physically realistic by current standards.
- **Counterfactual analysis**: Explore IF scenarios — what would happen if characters had made different decisions? (e.g., direct route without Jupiter flyby, low-thrust nozzle conservation path). This deepens the analysis.
- **Math rendering**: Use KaTeX or MathJax to render formulas readably in reports.
- **Verdict policy**: Reference calculations (where accuracy cannot be measured against a depicted value) should NOT use the "indeterminate" verdict. Reserve verdicts for claims that can be directly compared to in-story depictions.
- **External source links**: All external source citations (NASA NTRS, papers, worldbuilding documents) must be rendered as clickable hyperlinks, not plain text.
- **Orbit propagation validation**: After desk calculations (brachistochrone ΔV, Hohmann transfers), validate with detailed numerical orbit propagation. This is especially important for time-dependent parameters (travel time, planetary positions, arrival conditions). Use TDD: estimate and verify numerical integration accuracy (e.g. energy conservation of the full system) as test assertions.
- **Iterative re-analysis**: Seek overlooked viewpoints from nice-friend (Codex) and prior human feedback. When new perspectives emerge, re-analyze — especially items that weren't clearly plausible or had remaining questions. This iterative cycle (new perspective → re-analysis → new questions) deepens the analysis beyond initial conclusions.
- **Narrative plausibility review**: Beyond physics validation and cross-episode consistency, check whether computed values (durations, distances, conditions) match the **viewer's experience** of the story. If an analysis produces a result that feels inconsistent with on-screen depiction (e.g., year-long voyage in a show that implies shorter timeframes), flag this as a narrative plausibility concern and explore alternative interpretations.
- **Source priority**: Anime source material (映像・台詞) takes priority over worldbuilding documents (設定資料). When they conflict, analyze based on the anime depiction and discuss the discrepancy with the worldbuilding source.
- **Margin visualization**: Visualize how "ギリギリ" (narrow margin) each situation was — compare actual values against limits with gauge/bar charts and show alternative scenarios for context.
- **Time-series analysis**: Use time-axis charts (thrust profile, cumulative radiation dose, nozzle remaining life) to make temporal dynamics intuitive.
- **3D orbital analysis**: After 2D analysis is mature, extend to 3D considering orbital inclination, Saturn ring plane geometry, and Uranus axial tilt effects.
- **Plasmoid perturbation**: Estimate trajectory perturbations from plasmoid encounters, distinguishing radiation effects from momentum effects.
- **Physics consultation model**: Use gpt-5.2 or similar reasoning models (not -codex) for physics-specific consultations. Reserve -codex for design/architecture review.

## Data Infrastructure

- **Whisper model tracking**: Record STT generation conditions (model size, language, thresholds) structurally. YouTube VTT and other sources should be managed with the same metadata discipline.
- **Alternative STT**: Consider non-Whisper STT (Google, Azure) when accuracy is insufficient.
- **Speaker diarization**: May improve Phase 2 attribution accuracy — investigate and apply where beneficial.
- **Video analysis**: Downloaded video (gitignored) may be used for frame-by-frame OCR, subtitle extraction, and visual analysis.
- **Transcription data on Pages**: Make subtitle/transcription data browsable on GitHub Pages.
- **Transcription data layers**: Display transcription data in 3 layers: (1) raw data (unmodified VTT/Whisper), (2) preprocessed (alignment, diarization), (3) context-corrected (speaker attribution, text fixes). Clearly distinguish which layer the user is viewing.

## DAG Analysis

- **Rust-based DAG analysis**: DAG analysis (dependency chain extraction, impact cascade, layout algorithms) should be modeled in Rust and compiled to WASM, enabling real-time browser-side analysis in the DAG viewer.
- **Untangled visualization**: DAG should not just be laid out flat — dependencies must be "untangled" so that dependency chains and invalidation cascades are visually clear.

## Quality Assurance

- **Playwright E2E tests**: Add browser-based rendering tests to catch broken markdown tables, layout issues, and visual regressions. Use Playwright CLI.
- **Skill-ize workflows**: Define commonly repeated workflows (subtitle extraction, episode analysis, report review) as Claude Code Skills following Anthropic best practices.
- **Session log display**: Separate agent-loop stdout summary from conversation log display. In conversation logs, label the assistant as "Assistant (model)". Support sub-agent display where possible. Link each log to its associated commit(s) with GitHub URLs.
- **GitHub repo link**: The published GitHub Pages site must include a visible link to the source repository.

## Context Efficiency

- **TodoWrite discipline**: Only update the todo list on state transitions (task start, task complete). Do not update between every tool call.
- **Background long commands**: Use `run_in_background` for Bash commands that take >30s (yt-dlp, Whisper, cargo build on first run). Check with TaskOutput later.
- **Sonnet delegation**: Use Sonnet (or Haiku) for simple, well-defined tasks (file formatting, mechanical refactors, boilerplate generation) to reduce cost and latency. Always review delegated output. Criteria for delegation: (1) clear, unambiguous specification, (2) no architectural decisions, (3) output is easily validated by tests or visual inspection. When unsure, use Opus.
- **Subagent model selection**: Default to Haiku for exploration/research subagents. Reserve Sonnet/Opus for complex review or multi-step reasoning tasks.
- **Subagent scope limits**: Set `max_turns` on Task calls when the exploration scope is bounded (e.g., "find this function" → max_turns: 5).
- **Prefer dedicated tools in subagents**: Subagent prompts should explicitly prefer Read/Grep/Glob over Bash for file operations. This produces more structured output and uses fewer tokens.
- **Cost analysis**: Run `npm run analyze-costs` periodically (see `ts/src/analyze-costs.ts`) to track token usage patterns. Keep `ideas/cost_efficiency_analysis.md` updated.

## Key Principles

- **Document assumptions.** Every analysis depends on assumptions about parameters, data sources, and orbital conditions. Make these explicit in code comments and reports.
- **Don't trust unverified data.** Only original source material and parameters from verified institutions are reliable. Everything else must be cross-checked.
- **Prioritize anime source over worldbuilding docs.** Worldbuilding/setting documents (設定資料) are supplementary references. Parameters and conditions observed in the actual anime episodes take precedence in analysis.
- **Expand analysis scope.** Beyond the protagonist's ship (Kestrel), analyze other spacecraft, mooring stations, and orbital infrastructure depicted in the series.
- **Structure for traceability.** Build code and reports so that assumptions and data provenance are easy to inspect.
- **Explore multiple scenarios.** When an analysis finds a discrepancy, do not simply conclude "implausible" and stop. Instead, explore multiple parameter variations: what mass, thrust, trajectory, or timing would make the depicted scenario work? Discuss boundary conditions and plausible interpretations. The goal is to map the space of possibilities, not to render a single verdict.
- **Cite evidence for all claims.** Ship specs, orbital parameters, and other values used in analysis must cite their source (episode timestamp, worldbuilding document URL, etc.). Unsourced parameters undermine the analysis.
- **Cross-episode consistency.** Analyze consistency across episodes — e.g., do ship specs, mass assumptions, or orbital parameters used in one episode agree with those in another? Flag and discuss discrepancies.
