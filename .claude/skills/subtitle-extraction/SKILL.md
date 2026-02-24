---
name: subtitle-extraction
description: Extract and process subtitles from a SOLAR LINE episode video. Supports YouTube VTT download, Whisper STT, and dialogue line extraction.
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

### Whisper STT (slower, higher accuracy)
```bash
cd ts
# Step 1: Download audio (run in background — takes ~1 min)
# yt-dlp -x --audio-format wav -o ../raw_data/audio/ep<N>.wav "https://youtu.be/<video-id>"

# Step 2: Run Whisper (run in background — takes 2-5 min)
npm run whisper -- ../raw_data/audio/ep<N>.wav --model medium --language ja

# Step 3: Process output
npm run process-whisper -- ../raw_data/whisper/<output>.json --episode <N> --video-id <id>

# Step 4: Extract dialogue lines
npm run extract-dialogue-whisper -- ../raw_data/whisper/<processed>.json --episode <N>
```

### Compare transcription sources
```bash
npm run compare-transcriptions -- ../raw_data/subtitles/<vtt> ../raw_data/whisper/<whisper> --episode <N>
```

## Output Files

| Step | Output | Location |
|------|--------|----------|
| YouTube VTT | Raw subtitle file | `raw_data/subtitles/` (gitignored) |
| Whisper | Raw transcription JSON | `raw_data/whisper/` (gitignored) |
| Phase 1 Extract | `epNN_lines.json` | `reports/data/episodes/` |
| Phase 2 Attribute | `epNN_dialogue.json` + `epNN_speakers.json` | `reports/data/episodes/` |

## Important Notes

- **YouTube VTT accuracy is limited** for VOICEROID content — always cross-reference
- **Phase 2 (speaker attribution) is NOT automated** — requires context understanding
- **Whisper model selection**: Use `medium` for best Japanese accuracy; `small` is faster but less accurate
- **Long commands**: Use `run_in_background` for yt-dlp and Whisper to avoid inflating session context
- **All raw data is gitignored** — never commit audio/video files

## Data Sources

| Source | Type Code | Notes |
|--------|-----------|-------|
| YouTube auto-generated | `youtube-auto` | Default VTT download |
| YouTube manual | `youtube-manual` | Rare, higher quality |
| Whisper | `whisper` | Local inference, best accuracy |
| Manual | `manual` | Hand-transcribed |
