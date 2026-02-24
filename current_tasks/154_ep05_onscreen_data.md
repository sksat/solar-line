# Task 154: EP05 On-Screen Data Extraction

## Status: DONE

## Motivation

Extending video frame analysis to EP05 (final episode). EP05 covers the Uranus→Earth
return with composite route (507h), LEO 400km arrival, and nozzle destruction.
This completes the on-screen data extraction across all 5 episodes.

## Key Findings

### Complete Route Plan (frames 003-006)
- 4 burn sequences all displayed on-screen with exact parameters
- Uranus Escape: Δv=1500 km/s, T+00:00, D=25:26:00
- Jupiter Flyby: Δv=+600 km/s, T+375:00, D=12:12:00
- Mars Deceleration: Δv=-600 km/s, T+450:00, D=15:16:00
- Earth Capture/LEO Insert: Δv=-1500 km/s, T+479:00, D=27:44:00
- Total ΔV: 4200 km/s, Total burn: 80.6h, Coast fraction: 84.1%
- NOZZLE THERMAL LIMIT MARGIN: +0:26:00

### Jupiter Powered Flyby (frame 012)
- Exit velocity: 2100 km/s (entry 1500 + flyby 600)
- Exit vector: INC 31.47° / AZM 261.88°
- Target: Mars Decel Burn
- Io Torus exposure: <6 min

### Navigation Mode (frame 003)
- STELLAR-INS — AUTONOMOUS (FULL ROUTE)
- ALL BEACON-GUIDED MODES: UNAVAILABLE
- 507h ship time ETA

### Jurisdictional Zones (5 transitions)
- 天王星自由港機構 / 天王星圏
- 国際連合・火星自治連邦保護領 / 土星圏
- 木星軌道連合 / 木星圏
- 地球軌道港湾機構 / 自由圏 (NEW category)

### Earth Arrival (frames 020-022)
- Remaining Δv: 10 km/s → orbital velocity achieved
- LEO 400km over Philippines/SE Asia
- Nozzle destroyed after orbit insertion

## Changes Made

- Added EP05_KEYFRAMES (23 timestamps) to `ts/src/extract-frames.py`
- Extracted 23 frames to `raw_data/frames/ep05/`
- Created `reports/data/episodes/ep05_onscreen_data.json`
- Added `onScreenDataExploration` (ep05-exploration-04) to EP05 report
- Updated Task 154 status to DONE

## Dependencies

- Task 146 (frame extraction pipeline) — DONE
- Task 151 (EP04 on-screen data) — DONE
