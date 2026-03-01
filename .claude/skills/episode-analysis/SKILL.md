---
name: episode-analysis
description: Full pipeline for analyzing a new SOLAR LINE episode — from subtitle extraction through orbital analysis to published report. Use when starting analysis of a new episode.
argument-hint: <episode number> [youtube-video-id]
---

# Episode Analysis Pipeline

Complete workflow for analyzing a SOLAR LINE episode's orbital mechanics claims.

## Prerequisites

- Episode video downloaded to `raw_data/` (gitignored) if Whisper STT is needed
- YouTube video ID known (for subtitle collection)
- Previous episode analyses completed (for cross-episode consistency)

## Pipeline Steps

### Phase 1: Data Collection

1. **Collect YouTube subtitles** (if available):
   ```bash
   npm run collect-subtitles -- <video-id> --lang ja --out-dir raw_data/subtitles
   ```

2. **Run Whisper STT** (if video is available in raw_data/):
   ```bash
   npm run whisper -- raw_data/<video-file> --model large-v3-turbo --language ja
   npm run process-whisper -- raw_data/whisper/<output>.json --episode <N> --video-id <id>
   ```
   Run these as background tasks — they take 10-26 minutes (CPU-only).

3. **Extract dialogue lines** (Phase 1):
   ```bash
   npm run extract-dialogue -- raw_data/subtitles/<vtt-file> --episode <N> --video-id <id>
   ```
   Or from Whisper:
   ```bash
   npm run extract-dialogue-whisper -- raw_data/whisper/<processed>.json --episode <N>
   ```

4. **Run video OCR** (optional, for on-screen text extraction):
   ```bash
   python ts/src/extract-frames.py raw_data/<video-file> raw_data/frames/ep<N>
   python ts/src/video-ocr.py raw_data/frames/ep<N> --episode <N>
   ```

### Phase 2: Analysis

5. **Create analysis test file** (`ts/src/epNN-analysis.test.ts`):
   - TDD: Write expected orbital parameters as test assertions FIRST
   - Include: transfer distances, ΔV values, travel times, acceleration
   - Use existing episode tests as templates

6. **Create analysis module** (`ts/src/epNN-analysis.ts`):
   - Import from `../pkg/solar_line_wasm` for calculations
   - Define transfers, parameter explorations, and scenarios
   - Run brachistochrone, Hohmann, vis-viva calculations

7. **Validate with orbit propagation** (if time-dependent):
   - Use RK4/RK45 propagator for travel time validation
   - Check energy conservation as test assertion

### Phase 3: Report Generation

8. **Create episode report MDX** (`reports/data/episodes/epNN.md`):
   - Follow MDX format (YAML frontmatter + markdown with code fences for structured data)
   - See existing ep01.md–ep05.md for template structure
   - Include: video-cards, transfers, explorations, orbital diagrams, dialogue-quotes
   - All text in Japanese (日本語)
   - Cite dialogue with timestamps: きりたん「…」(MM:SS)

9. **Add orbital diagrams**:
   - At least 1 heliocentric transfer diagram
   - Planet-centric diagrams for capture/escape maneuvers
   - Use computed planetary positions from ephemeris (2215 epoch)
   - Add animation config with burn markers

10. **Update cross-episode reports**:
    - `reports/data/summary/cross-episode.md`: Add new episode data
    - `reports/data/summary/science-accuracy.md`: Add verification items
    - `reports/data/summary/ship-kestrel.md`: Update ship timeline

### Phase 4: Validation

11. **Run all tests**:
    ```bash
    cd ts && npm test
    cd .. && cargo test --workspace
    ```

12. **Build and verify**:
    ```bash
    cd ts && npm run build
    ```

13. **Consult Codex for review** (use `/nice-friend` skill):
    - Review report readability
    - Verify orbital mechanics accuracy
    - Check cross-episode consistency

## Efficiency Notes

- Use `run_in_background` for Whisper and yt-dlp commands
- Prefer Sonnet subagents for file exploration (NOT Haiku — insufficient quality)
- Keep TodoWrite updates to state transitions only
- Dialogue attribution (Phase 2) requires manual/context-assisted work — don't fully automate
