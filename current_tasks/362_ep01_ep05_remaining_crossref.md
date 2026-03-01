# Task 362: Integrate Remaining EP01 & EP05 Onscreen Crossref Findings

## Status: DONE

## Description
Complete the onscreen crossref integration across all episodes by adding remaining findings:

### EP05 (higher priority)
1. **Jurisdictional progression**: 5-zone governance structure (天王星自由港機構→保護領→木星軌道連合→地球軌道港湾機構/自由圏). "自由圏" is EP05-first.
2. **Navigation autonomy**: STELLAR-INS AUTONOMOUS with ALL BEACONS UNAVAILABLE — the "追放された船" narrative link.

### EP01 (supplementary)
3. **Mars departure altitude**: 52° apparent diameter → 560 km above surface.
4. **Total ΔV budget**: ~6.3 km/s estimated Jupiter operations total.

## Changes
- `reports/data/episodes/ep05.md`: Jurisdiction + navigation analysis
- `reports/data/episodes/ep01.md`: Mars departure + ΔV budget
- `ts/src/article-content-validation.test.ts`: TDD content tests
- `reports/data/summary/tech-overview.md`: Stats refresh
