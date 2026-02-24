# Task 148: EP02 On-Screen Data Extraction

## Status: DONE

## Motivation

Extending video frame analysis from EP01 (Task 146) to EP02.
EP02 covers Jupiter escape → Saturn/Enceladus arrival with a 455-day ballistic transfer.
On-screen displays may reveal navigation parameters for this interplanetary leg.

## Key Timestamps

- 00:53 — 冷却系圧力0.04MPa低下（EVA点検シーン）
- 01:46 — 相対速度増加傾向、3時間後に最近接を外れる（木星・イオ近傍）
- 06:58 — 木星離脱航路（イオ・トーラス外縁スカート付近）、追手到達まで13時間
- 09:07 — 高度50 RJ、木星基準速度10.3 km/s（磁気圏縁ゲート）
- 13:27 — エンケラドゥス・リレー到着（国際連合・火星自治連邦保護領 / 土星圏）
- 16:18 — 外縁軌道投入推進シークエンス開始（点火ウィンドウまで5時間）
- 16:37 — **NAVIGATION OVERVIEW** — COIAS軌道交差警報、相対速度-0.12 km/s ★最重要
- 17:18 — 恒星掩蔽による大型船検知
- 17:28 — 大型船の待ち伏せ戦術推定（航法灯・トランスポンダOFF、相対速度≈0）

## Key Findings

### Navigation Display (16:37) — Most Data-Rich Frame
- **NAVIGATION OVERVIEW** display with Saturn-centric orbital diagram
- System: **MARS PORT AUTHORITY** (火星港湾公社)
- Ship ID: **MTS-9907/EXT-P17** (ケストレルの船籍番号、初めて判明)
- Alert system: **COIAS** (ORBITAL CROSS ALERT)
- **Relative velocity: -0.12 km/s** (120 m/s) — approaching
- "**OVERS BURN**" label — overshoot correction burn (EP01の PERIJOVE OVERSHOT CORRECTION に対応)
- Orbital diagram shows: SATURN center, CELADUS ORBIT, S2-ENCELADUS, INTERSECTION point
- Unknown vessel ID: **MPA-MC-SCV-02814** (50万t級大型船)

### Jupiter Departure Parameters (09:07-09:11)
- Location: 木星磁気圏縁ゲート (magnetosphere edge gate)
- **Altitude: 50 RJ** (Jupiter radii)
- **Jupiter-relative velocity: 10.3 km/s**
- Trajectory: 扇状面の中心線に同調 (synchronized with Io torus fan plane center line)
- Thrust: trim only (no main engine)
- V∞ from Jupiter ≈ 5.93 km/s (computed: sqrt(10.3² - 8.42²))

### Location Labels (Scene Setting Captions)
Three distinct location labels:
1. 木星離脱航路 (イオ・トーラス外縁スカート付近) / 木星港湾公社 / 木星圏
2. 木星離脱航路 (木星磁気圏縁ゲート) / 木星港湾公社 / 木星圏
3. エンケラドゥス・リレー / 国際連合・火星自治連邦保護領 / 土星圏

### Other Technical Data
- Cooling pressure drop: 0.04 MPa (outer secondary cooling line)
- Pursuit ships: Earth/Mars ships, 13 hours ETA
- Large ship detection: stellar occultation (background star monitoring)
- Large ship tactics: nav lights OFF, transponder OFF, near-zero relative velocity

## Comparison with EP01

EP01 had a richer navigation HUD (V∞, ΔV values, 3-phase burn sequence, azimuth).
EP02's NAVIGATION OVERVIEW focuses on collision avoidance and is less parameter-dense.
However, EP02 uniquely reveals:
- Kestrel's ship registration number (MTS-9907/EXT-P17)
- Mars Port Authority operating system
- COIAS alert system
- Large ship vessel ID (MPA-MC-SCV-02814)
- Jurisdiction labels for different space regions

## Artifacts

- `reports/data/episodes/ep02_onscreen_data.json`: Structured on-screen data (19 frames)
- `ts/src/extract-frames.py`: Updated with EP02 keyframe timestamps
- `raw_data/frames/ep02/`: Extracted frame images (gitignored)

## Dependencies

- Task 146 (frame extraction pipeline) — DONE
