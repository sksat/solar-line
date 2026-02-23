# Idea: OCR / Speech-to-Text Infrastructure for Subtitles

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
