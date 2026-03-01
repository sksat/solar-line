# Task 285: Whisper Turbo Transcription Upgrade

## Objective
Upgrade Whisper transcription from medium to turbo (large-v3-turbo) model for all 5 episodes to improve ASR accuracy. Task 284 built the accuracy measurement infrastructure (Levenshtein-based comparison); EP01 medium achieves 82.6% corpus accuracy vs official script.

## Results

| Episode | Segments | Lines | Quality (avg log prob) |
|---------|----------|-------|----------------------|
| EP01 | 384 reliable / 391 total | 375 | -0.207 |
| EP02 | 400 / 400 | 391 | -0.165 |
| EP03 | 279 / 279 | 278 | -0.148 |
| EP04 | 298 / 302 | 280 | -0.262 |
| EP05 | 491 / 491 | 480 | -0.172 |

### EP01 Accuracy Comparison (vs official script)

| Source | Corpus Accuracy | Mean Line | Median Line |
|--------|----------------|-----------|-------------|
| YouTube VTT | 68.3% | 8.6% | 0.0% |
| Whisper medium | 82.6% | 83.0% | 90.0% |
| **Whisper turbo** | **91.4%** | **88.5%** | **95.8%** |

Turbo improves corpus accuracy by **+8.8pp** over medium.

## Decision: turbo over large-v3
- large-v3 (3GB): ~24 frames/s on CPU — prohibitively slow (~80 min per episode)
- turbo / large-v3-turbo (1.5GB): ~73-180 frames/s — feasible (~10-26 min per episode)
- turbo accuracy already +8.8pp over medium, sufficient improvement

## Files Created/Modified
- `reports/data/episodes/ep0{1-5}_lines_whisper_turbo.json` — turbo transcription lines
- `reports/data/calculations/transcription_accuracy.json` — regenerated with turbo data
- `ts/src/transcription-accuracy.test.ts` — 3 turbo accuracy tests
- `ts/src/article-content-validation.test.ts` — 2 turbo validation tests
- `scripts/run_whisper_large_v3.py` — batch Whisper processing script
- `scripts/process_large_v3_output.sh` — pipeline processing helper
- Raw data (gitignored): `raw_data/whisper/turbo_raw/`, `raw_data/whisper/turbo/`

## Status: DONE
