# Task 033: Report Data Quality Fixes

## Status: DONE

## Scope
Fix data quality issues found in report audit (EP04, EP05 JSON).

## Changes Made

### High Priority — Fixed
1. **EP05 animation timing**: Fixed `durationSeconds` from placeholder values (10/8) to real transit seconds (717,120 for 8.3-day brachistochrone @300t, 86,400 for Earth capture visualization). Fixed transfer `startTime`/`endTime` from 0-10 scale to real seconds. Removed startTime/endTime from Hohmann reference (no animation needed).

### Medium Priority — Fixed
2. **EP04 480 mSv dialogue quote**: Added `ep04-quote-15` — ゲスト（天王星人）「480ミリシーベルト。随分と無茶をしてきたのね」(10:17). Added to `ep04-transfer-04` evidenceQuoteIds. Text matches `ep04_dialogue.json` entry at startMs 616600.
3. **EP05 summary newline**: Consolidated summary into single paragraph (removed embedded `\n\n` that degraded index page card rendering).
4. **EP04 transfer ordering**: Reordered transfers array to match narrative timeline: Hohmann ref → Plasmoid (02:13) → Fleet (13:18) → Departure (17:29) → Brachistochrone (17:29). Transfer IDs preserved (no reference breakage).

### Low Priority (deferred)
- EP05 YouTube video card (blocked on upload)
- Cross-episode provisional markers (by design, pending subtitles)
- Calculator presets EP01-only (future enhancement)

## Test Results
- 680 TS tests pass (0 failures)
- Site builds: 5 episodes, 24 transfers, 1 summary, 7 logs

## Depends on
- Task 023 (EP05 analysis) — PARTIAL
- Task 020 (EP04 analysis) — DONE
