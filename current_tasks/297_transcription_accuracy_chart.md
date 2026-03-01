# Task 297: Transcription Accuracy Comparison Bar Chart

## Status: DONE

## Goal
Add a visual bar chart comparing transcription accuracy across sources (VTT, Whisper-medium, Whisper-turbo, OCR) on the transcription pages. Currently accuracy is displayed as text-only percentages in a table row. A visual chart makes the comparison more intuitive.

## Motivation
CLAUDE.md: "Prioritize visual explanations — readers benefit from seeing data rather than just reading numbers. Add comparison charts... wherever they aid understanding."

Currently the accuracy metrics render as plain text: "VTT: 68.3%、whisper-medium: 82.6%、whisper-turbo: 91.4%、ocr: 10.1%". A horizontal bar chart would make differences immediately obvious.

## Scope
1. Add a bar chart component to `templates.ts` for accuracy metrics
2. Render accuracy comparison as a colored horizontal bar chart on transcription pages
3. Write TDD tests for the new rendering
4. Only EP01 has all 4 sources for comparison; other episodes have fewer — chart should handle variable source counts

## Non-Goals
- Changing the data model (AccuracyMetric type is already sufficient)
- Adding uPlot (this is a simple static bar chart, similar to margin-gauge)
