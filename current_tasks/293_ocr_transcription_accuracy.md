# Task 293: OCR Transcription Accuracy Comparison

## Status: DONE

## Goal
Integrate OCR subtitle text into the transcription accuracy comparison pipeline.
Currently, transcription accuracy is measured for VTT, Whisper-medium, and Whisper-turbo
against the EP01 official script. OCR data (Tesseract 5.3) exists for all 5 episodes
but has not been compared for accuracy.

## Completed
1. Added `ocrToEpisodeLines()` conversion function in `transcription-accuracy.ts`
   - Converts OCR frame-level data to `EpisodeLines` format
   - Skips frames with null/empty subtitleText
   - Assigns sequential line IDs (ep01-ocr-001, etc.)
2. Added `"video-ocr"` to source type union in `dialogue-extraction-types.ts` and `report-types.ts`
3. Updated `transcription-accuracy-report.ts` to include OCR data in comparisons
4. Regenerated `transcription_accuracy.json` with OCR results
5. OCR accuracy automatically displayed on transcription page (pipeline already handles it)
6. Added 11 new tests:
   - 7 unit tests for `ocrToEpisodeLines` (format, IDs, null handling, timestamps, episode mapping)
   - 4 integration tests for EP01 OCR real data (line count, sourceType, accuracy range, comparison)
7. Stats refresh: 292→293 tasks, 2176→2187 TS tests, 2767→2778 total

## Results
- EP01 OCR corpus accuracy: **10.1%** (21 OCR frames vs 229 script lines)
- Comparison: VTT 68.3%, Whisper-medium 82.6%, Whisper-turbo 91.4%, OCR 10.1%
- Tesseract OCR on Japanese anime subtitles is extremely poor — establishes baseline for improvement
