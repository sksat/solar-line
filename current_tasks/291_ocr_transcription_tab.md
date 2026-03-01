# Task 291: Add OCR data tab to transcription pages

## Status: DONE

## Description
Integrate OCR data (from Task 289's video-ocr.py output) into the transcription page UI as a new tab. The OCR data files (ep01-05_ocr.json) contain per-frame subtitle text and HUD text extracted via Tesseract.

Steps:
1. Add `ocrData` field to TranscriptionPageData
2. Load OCR JSON files in build.ts when building transcription pages
3. Render OCR tab in templates.ts with frame-by-frame text display
4. Add tests for the new functionality
5. Build and verify
