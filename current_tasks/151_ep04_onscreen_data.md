# Task 151: EP04 On-Screen Data Extraction

## Status: DONE

## Motivation

Extending video frame analysis to EP04.
EP04 covers Titania → Earth return, with 65% thrust limitation, plasmoid encounter
(480 mSv), and security fleet pursuit. On-screen displays may reveal navigation
parameters for this return journey.

## Key Findings

### TRAJECTORY PREDICTION — Plasmoid Zone Parameters (02:38-02:45)

The most scientifically detailed display in EP04, showing real-time environmental monitoring:

#### Orbital Trajectory
- **Periapsis Altitude**: 6.50 RU
- **Intercept Velocity**: 18.3 km/s
- **Vector**: 2.1° INC / AZM 110.8°
- **U3-Titania Approach**: T+9h
- **Advisory Index**: CRITICAL

#### Plasmoid Zone (Estimated)
- **Magnetic Field**: 180-340 nT
- **Plasma Density**: 0.8-2.3 cm⁻³
- **Core Temperature**: 2.1×10⁶ K
- **Traverse Time**: 00:08:00

#### Shield & Operational Constraints
- **Shield Capacity**: 63% (12H TO CRITICAL)
- **Shield Remaining Lifetime**: 14 min
- **Margin**: 6 min (14 min life − 8 min traverse)
- **Burns Remaining**: 1-2 MAXIMUM
- **Navigation**: CS > INERTIAL (BEACON UNAVAIL)

### Ship Status
- **Cooling System**: 0.74 MPa (63% of specification)
- **Nozzle Burnout Probability**: 67% on next ignition
- **Cumulative Radiation**: 480 mSv (dry patch reading)
- **Engine Output**: 65% (thrust 6.3 MN)

### Location Labels
- 天王星エントリー軌道 / 天王星自由港機構 / **タイタニア自治圏**
  - New jurisdiction "タイタニア自治圏" — more specific than EP03's "天王星圏"

### Narrative Moments
- 「星は嘘をつかない」のかって — reflecting on EP03's navigation crisis
- 「新しいソーラーライン」を… 私が拓いてやる — series title as mission statement
- Deep space scanner: multiple large ships approaching from Saturn orbit direction

## Artifacts

- `reports/data/episodes/ep04_onscreen_data.json`: Structured on-screen data (14 frames)
- `ts/src/extract-frames.py`: Updated with EP04 keyframe timestamps
- `raw_data/frames/ep04/`: Extracted frame images (gitignored)

## Dependencies

- Task 146 (frame extraction pipeline) — DONE
- Task 150 (EP03 on-screen data) — DONE
