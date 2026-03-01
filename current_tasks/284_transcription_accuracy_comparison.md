# Task 284: EP01 Transcription Accuracy Comparison

## Objective
Build automated accuracy measurement comparing EP01 official script (Layer 0) against VTT and Whisper transcriptions. This quantifies transcription quality and helps prioritize future STT improvements.

## Scope
1. Implement line-level text similarity metrics between:
   - Official script (ep01_script.json) vs VTT (ep01_lines.json)
   - Official script vs Whisper (ep01_lines_whisper.json)
2. Produce structured accuracy report (JSON + rendered on site)
3. Unit tests for the comparison functions

## Results

| Metric | YouTube VTT | Whisper (medium) |
|--------|------------|-----------------|
| Corpus accuracy | 68.3% | 82.6% |
| Mean line accuracy | 8.6%* | 83.0% |
| Median line accuracy | 0.0%* | 90.0% |

*VTT line-level metrics are low due to segmentation mismatch (87 VTT vs 229 script lines).
Corpus-level is the fair comparison metric.

## Files Created/Modified
- `ts/src/transcription-accuracy.ts` — core comparison module
- `ts/src/transcription-accuracy.test.ts` — 32 unit tests
- `ts/src/transcription-accuracy-report.ts` — CLI report generator
- `reports/data/calculations/transcription_accuracy.json` — generated data
- `ts/src/build.ts` — loads accuracy data for transcription pages
- `ts/src/report-types.ts` — added accuracyMetrics to TranscriptionPageData
- `ts/src/templates.ts` — displays accuracy on transcription page
- `ts/src/article-content-validation.test.ts` — 5 accuracy validation tests

## Also Fixed
- Pre-existing E2E failure: tech-overview "feature checklist" test expected ≥10 ✅ but only 2 exist

## Status: DONE
