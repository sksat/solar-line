# Idea: OCR / Speech-to-Text Infrastructure for Subtitles

## Status: RESOLVED

All three approaches have been implemented:
1. **OCR on video frames**: Tesseract 5.3 pipeline (Task 289), OCR transcription tab (Task 291), OCR accuracy comparison (Task 293)
2. **Speech-to-text**: Whisper medium (Task 009) + Whisper large-v3-turbo (Task 285). EP01 turbo accuracy: 91.4%
3. **Multi-source comparison**: Inter-source agreement charts (Task 298), accuracy bar charts (Task 297)

## Background
YouTube auto-generated VTT subtitles are unreliable for VOICEROID content.
Human directive: build OCR and speech-to-text infrastructure as additional subtitle sources.

## Possible Approaches
1. **OCR on video frames**: Extract on-screen text (subtitles, HUD displays, navigation data)
   - Would capture ship instrument readings, orbital parameters shown on screen
   - Could use Tesseract with Japanese models or cloud OCR APIs
2. **Speech-to-text**: Apply better ASR than YouTube's auto-captioning
   - Whisper (OpenAI) has better Japanese support
   - Could run locally or via API
   - VOICEROID voices may still be challenging but likely better than YouTube
3. **Manual transcription framework**: Tools to assist human transcribers
   - Video player with timestamp capture
   - Side-by-side VTT + correction interface

## Priority
Medium — current VTT + manual correction workflow works but is labor-intensive.
Building Whisper-based ASR could significantly improve Phase 1 extraction quality.

## Related
- Task 009 (subtitle attribution)
- ideas/voiceroid_asr_quality.md
