# Task 289: Video OCR pipeline

## Status: DONE

## Description
Build a video OCR extraction pipeline using Tesseract to extract subtitle text and HUD/instrument panel text from video frames. This creates a new transcription data source alongside VTT and Whisper.

## Approach
1. Subtitle extraction: Grayscale threshold (>180) on bottom 20% of frame → Tesseract jpn
2. HUD extraction: Lower threshold (>120) on upper 70% of frame → Tesseract eng
3. Process all episodes using existing extracted keyframes

## Results
- EP01: 21 frames → 21 subs, 18 HUD texts
- EP02: 13 frames → 12 subs, 13 HUD texts
- EP03: 14 frames → 12 subs, 12 HUD texts
- EP04: 14 frames → 14 subs, 10 HUD texts
- EP05: 23 frames → 18 subs, 20 HUD texts
- +26 validation tests (2173 TS tests total)

## Technical Details
- Engine: Tesseract 5.3.0 with jpn + eng language packs
- Preprocessing: PIL grayscale conversion + numpy threshold + binary mask
- manga-ocr was tested but found unsuitable for anime subtitle overlays (hallucinates text)
- OCR accuracy is imperfect but captures numbers, technical terms, and sentence structure
- HUD text from EP01 654s frame correctly reads BURN SEQUENCE, DELTA-V values, PERI-JUPITER

## Files
- `ts/src/video-ocr.py` — OCR extraction script
- `reports/data/episodes/ep0{1-5}_ocr.json` — structured OCR results
- `ts/src/report-data-validation.test.ts` — 26 new validation tests

## Follow-up
- Integrate OCR data into transcription page display (new tab)
- Cross-compare OCR subtitle text with VTT/Whisper for accuracy metrics
