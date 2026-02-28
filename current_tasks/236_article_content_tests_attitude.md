# Task 236: Article Content Tests — attitude-control report

## Status: DONE

## Description

Add article content validation tests for attitude-control.md. This report has rich numerical claims derived from physics calculations that should be protected against silent regressions.

## Key Testable Claims
- Moment of inertia: pitch/yaw 45,796,000 kg·m², roll 1,350,000 kg·m²
- EP03 nav crisis: 1.23° angle, 14,390,000 km miss distance, 0.2% accuracy
- INS drift: 0.01°/h × 143h = 1.43°
- EP05 arrival: 20 km at 18.2 AU = 1.5 milliarcsec
- Flip RCS: 300s flip needs 830 N
- Gravity gradient torque at LEO 400 km
- Evaluation table: 7 items across all episodes
