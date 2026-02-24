# Task 150: EP03 On-Screen Data Extraction

## Status: DONE

## Motivation

Extending video frame analysis from EP01-02 (Tasks 146, 148) to EP03.
EP03 covers Enceladus departure → Titania arrival (143 hours).

## Key Findings

### EP03 has the RICHEST navigation data of any episode

#### NAVIGATION OVERVIEW — Complete Route Plan (02:57-03:48)
- **DESTINATION**: U-3 Titania Terminal Complex (U3-TTC)
- **ARRIVAL ETA**: T+143:12:00 (PORT STD TIME) — matches dialogue exactly
- **NAV MODE**: SATURN-REF > SOL-INERTIAL > URANUS-REF (Scheduled)
- **Route name**: **SOLER LINE** — the series title is the route name!
- **ORB-CURTAIN BOUNDARY CROSSING DETECTED** — legal risk acceptance warning
- Ship ID: MTS-9907/EXT-P17, Ship marker: MTS-9907-E01

#### 6-Phase Burn Sequence (most detailed of any episode)
1. **Saturn Escape**: Δv=4.31 km/s, T+00:00, Duration 0:10:10 (green)
2. **Cruise Burn**: Δv≈2.99×10³ km/s (=2990 km/s), T+03:30, Duration **30:25:00** (green)
3. **Exoplanar Alignment** (RCS Trim): Δv=0.11 km/s, T+47:00, Duration 0:18:00 (red)
4. **MCC-1** (RCS Trim): Δv=0.05 km/s, T+71:00 (red)
5. **MCC-2** (RCS Trim): Δv≈0.07 km/s (partially obscured) (red)
6. **Capture Prep**: Δv≈2990 km/s, Duration **30:25:30** (red)

**Brachistochrone confirmation**: Cruise Burn (30:25:00) ≈ Capture Prep (30:25:30)!

#### PLASMOID STORM Warning
- **EST T+138:00:00** — predicted 5 hours before arrival, foreshadowing EP04

#### Navigation Crisis Display (14:12-14:16)
- **SOLUTION A**: Star Tracker Reference, Confidence **92.3%**
- **SOLUTION B**: Inertial Guidance Reference, Confidence **91.7%**, Last Correction: -21min
- **DIFF/ENT: 1.43×10^7 [km]** = 14,300,000 km — matches dialogue 1436万km (0.4% rounding)
- Two diverging trajectory lines visualize the crisis

#### Uranus Approach
- **Altitude 25 RU** at magnetosphere entry
- NAV reference switch: SOL-INERTIAL → URANUS-REF

#### Location Labels — New Jurisdiction
- エンケラドゥス停泊軌道 / 国際連合・火星自治連邦保護領 / 土星圏
- 天王星エントリー軌道 / **天王星自由港機構** / 天王星圏

## Artifacts

- `reports/data/episodes/ep03_onscreen_data.json`: Structured on-screen data (14 frames)
- `ts/src/extract-frames.py`: Updated with EP03 keyframe timestamps
- `raw_data/frames/ep03/`: Extracted frame images (gitignored)

## Dependencies

- Task 146 (frame extraction pipeline) — DONE
- Task 148 (EP02 on-screen data) — DONE
