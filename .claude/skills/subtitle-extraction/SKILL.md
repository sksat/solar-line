---
name: subtitle-extraction
description: Extract and process subtitles from a SOLAR LINE episode video. Supports YouTube VTT download, Whisper STT, video OCR, and dialogue line extraction.
argument-hint: <video-id-or-path> --episode <N>
---

# Subtitle Extraction Pipeline

Extract subtitles from SOLAR LINE episodes using multiple sources.

## Quick Reference

### YouTube VTT (fastest, lower accuracy for VOICEROID)
```bash
cd ts
npm run collect-subtitles -- <youtube-video-id> --lang ja --out-dir ../raw_data/subtitles
npm run extract-dialogue -- ../raw_data/subtitles/<vtt-file> --episode <N> --video-id <id>
```

### Whisper STT (slower, highest accuracy — 91.4% on EP01)
```bash
cd ts
# Step 1: Download audio (run in background — takes ~1 min)
# yt-dlp -x --audio-format wav -o ../raw_data/audio/ep<N>.wav "https://youtu.be/<video-id>"

# Step 2: Run Whisper (run in background — takes 10-26 min CPU-only)
npm run whisper -- ../raw_data/audio/ep<N>.wav --model large-v3-turbo --language ja

# Step 3: Process output
npm run process-whisper -- ../raw_data/whisper/<output>.json --episode <N> --video-id <id>

# Step 4: Extract dialogue lines
npm run extract-dialogue-whisper -- ../raw_data/whisper/<processed>.json --episode <N>
```

### Video OCR (on-screen text extraction via Tesseract)
```bash
cd ts
# Step 1: Extract keyframes from video
python src/extract-frames.py ../raw_data/<video-file> ../raw_data/frames/ep<N>

# Step 2: Run OCR on extracted frames
python src/video-ocr.py ../raw_data/frames/ep<N> --episode <N>
```
Output: `reports/data/episodes/epNN_ocr.json`

### Compare transcription sources
```bash
npm run compare-transcriptions -- ../raw_data/subtitles/<vtt> ../raw_data/whisper/<whisper> --episode <N>
```

## Output Files

| Step | Output | Location |
|------|--------|----------|
| YouTube VTT | Raw subtitle file | `raw_data/subtitles/` (gitignored) |
| Whisper | Raw transcription JSON | `raw_data/whisper/` (gitignored) |
| Video OCR | OCR data JSON | `reports/data/episodes/epNN_ocr.json` |
| Phase 1 Extract | `epNN_lines.json` | `reports/data/episodes/` |
| Phase 2 Attribute | `epNN_dialogue.json` + `epNN_speakers.json` | `reports/data/episodes/` |

## Important Notes

- **YouTube VTT accuracy is limited** for VOICEROID content (~68% on EP01) — always cross-reference
- **Whisper large-v3-turbo** is the recommended model (91.4% accuracy on EP01 vs 82.6% for medium)
- **Phase 2 (speaker attribution) is NOT automated** — requires context understanding
- **Long commands**: Use `run_in_background` for yt-dlp and Whisper to avoid inflating session context
- **All raw data is gitignored** — never commit audio/video files

## Data Sources

| Source | Type Code | Accuracy (EP01) | Notes |
|--------|-----------|-----------------|-------|
| YouTube auto-generated | `youtube-auto` | 68.3% | Default VTT download |
| YouTube manual | `youtube-manual` | — | Rare, higher quality |
| Whisper (large-v3-turbo) | `whisper` | 91.4% | Local inference, best accuracy |
| Whisper (medium) | `whisper` | 82.6% | Faster, lower accuracy |
| Video OCR (Tesseract) | `video-ocr` | 10.1% | On-screen text only |
| Manual | `manual` | — | Hand-transcribed |
