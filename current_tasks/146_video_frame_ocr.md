# Task 146: Video Frame OCR — On-Screen Data Extraction

## Status: DONE

## Motivation

SOLAR LINE episodes display ship instrument readings, navigation data, and orbital
parameters on screen (HUD displays, cockpit readouts, status panels). These provide
a primary source for verifying analysis parameters that is more reliable than
auto-generated subtitles.

Human directive: build OCR infrastructure as additional data source (see ideas/ocr_speech_to_text.md).
CLAUDE.md: "Video analysis: Downloaded video (gitignored) may be used for frame-by-frame OCR"

## Approach

- Used ffmpeg to extract 21+ key frames from EP01 video at timestamps identified
  from dialogue data (technical parameter mentions)
- Manual visual reading of frames by Claude (multimodal vision)
- Structured data extraction into JSON format

## Key Findings — EP01 On-Screen Parameters

### Navigation Display at 10:54 (JO-DIRECT ENTRY)
Most data-rich frame in the episode. Shows full navigation overview:
- **V∞ = 12.0 km/s** (hyperbolic excess velocity at Jupiter SOI)
- **Entry velocity = 17.8 km/s** (at 20.0 RJ, Jovian Center frame)
- **Azimuth = 282.14°**
- **BURN SEQUENCE:**
  - Phase 1: CRUISE ACCEL (Mars → Jovian Sphere) — Completed
  - Phase 2: FULL BURN ENTRY — ΔV = +2.4 km/s, T-11:42:18
  - Phase 3: PERIJOVE OVERSHOT CORRECTION — ΔV = -2.3 km/s, window ±5:00 min
- **Perijupiter altitudes: 1.5 RJ and 2.0 RJ** shown on orbital diagram

### Engine Thrust Relationships
- 65% output → 6.3 MN (from dialogue at 5:16)
- 100% output → 9.8 MN (from dialogue at 13:33)
- **110% output → 10.7 MN** (NEW — from subtitle at 16:49, not in existing analysis)
- Thrust-output relationship is nearly linear (10.7/9.8 = 1.092 ≈ 1.1)

### Other Parameters
- Mars apparent diameter 52° on rear camera (→ distance ~3,600 km at departure)
- Perijupiter countdown: 4 min 50 sec remaining
- Overshoot window: ±180 seconds
- Fuel type: D-He3 (deuterium-helium-3) cartridge system

## Analysis Implications

1. V∞=12.0 km/s should be cross-referenced with our computed hyperbolic excess velocity
2. Total ΔV budget from HUD: +2.4 + |-2.3| = 4.7 km/s — compare with our analysis
3. 110% thrust capability (10.7 MN) adds a parameter not in existing EP01 analysis
4. Mars apparent diameter gives an independent distance check for departure timing
5. Navigation display confirms perijupiter at 1.5 RJ (matches dialogue "オーバー筋の木星高度は1.5RJ")

## Artifacts

- `ts/src/extract-frames.py`: Frame extraction script with EP01 keyframe timestamps
- `reports/data/episodes/ep01_onscreen_data.json`: Structured on-screen parameter data
- `raw_data/frames/ep01/`: Extracted frame images (gitignored)
- `raw_data/video/`: Downloaded video (gitignored)

## Notes

- Frame text resolution limited at 720p; higher resolution may reveal more HUD detail
- Automated OCR (manga-ocr, tesseract) not yet integrated — manual reading was more
  accurate for this initial extraction
- Future work: extend to EP02-EP05, automate subtitle text extraction from frames
