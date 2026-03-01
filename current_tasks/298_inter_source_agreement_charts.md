# Task 298: Inter-Source Agreement Charts for All Episodes

## Status: DONE

## Goal
Add inter-source agreement metrics and charts to EP02-05 transcription pages.
Currently only EP01 shows accuracy data (vs official script). For episodes without
official scripts, show pairwise agreement between available sources (VTT ↔ Whisper-medium,
VTT ↔ Whisper-turbo, Whisper-medium ↔ Whisper-turbo) as a quality proxy.

## Approach
1. Add `computeSourceAgreement()` function using existing Levenshtein infrastructure
2. Extend transcription-accuracy-report.ts to generate agreement data for all episodes
3. Add agreement metrics to TranscriptionPageData
4. Extend renderAccuracyChart to handle both accuracy (vs script) and agreement (pairwise)
5. TDD: write tests first, then implement
6. Add E2E tests for charts on EP02-05 transcription pages

## Files Modified
- ts/src/transcription-accuracy.ts — new agreement computation
- ts/src/transcription-accuracy.test.ts — TDD tests
- ts/src/transcription-accuracy-report.ts — generate agreement data
- ts/src/build.ts — pass agreement data to transcription pages
- ts/src/templates.ts — render agreement chart section
- ts/src/templates.test.ts — chart rendering tests
