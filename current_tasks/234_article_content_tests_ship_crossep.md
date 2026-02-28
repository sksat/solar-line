# Task 234: Extend Article Content Tests — ship-kestrel + cross-episode

## Status: DONE

## Description

Extend the article content validation tests (Task 231) to cover ship-kestrel.md and cross-episode.md. These reports contain critical numerical values that are cross-referenced by episode reports. Validate key specs against TS source constants.

## Tests to Add

### ship-kestrel.md
- Ship specs: 42.8m, 9.8 MN, 48,000t, 6.37 MN / 65%, Isp 10⁶s
- Mass boundaries: EP01 ≤299t, EP03 ≤452.5t
- Nozzle lifespan: 26min margin, 0.78%

### cross-episode.md
- Full route: ~124 days, 35.9 AU, 24 transfers
- Relativistic: γ ≈ 1.0003, peak 2.5%c
- Nozzle margin cited
- All 5 episodes referenced
