# Task 039: Expand Cross-Episode Analysis Beyond Episode-Based Structure

## Status: DONE

## Motivation
Human directive: "クロスエピソード分析はそれ単体だけでなく、各船の仕様など、エピソード以外の観点からも柔軟に行ってよい"

The current cross-episode analysis (`reports/data/summary/cross-episode.json`) is structured around comparing metrics across episodes. The human wants additional analysis dimensions:
- Ship specifications (Kestrel mass/thrust evolution, damage accumulation)
- Physical science accuracy (real vs. depicted values)

## Implementation (Codex-reviewed design)

### New Types (report-types.ts)
- `TimelineEvent`: episode, timestamp, label, description, stateChanges, evidenceQuoteId
- `EventTimeline`: caption, events[] — for ship damage/repair history
- `VerificationStatus`: "verified" | "approximate" | "unverified" | "discrepancy"
- `VerificationRow`: claim, episode, depicted, reference, source, accuracyPercent, status
- `VerificationTable`: caption, rows[] — for science accuracy scorecard
- `SummarySection`: extended with optional `eventTimeline` and `verificationTable`

### New Renderers (templates.ts)
- `renderEventTimeline()`: vertical timeline with markers, state changes, episode badges
- `renderVerificationTable()`: table with Japanese headers, accuracy %, status badges
- `verificationStatusInfo()`: maps status to Japanese label + CSS class
- CSS: `.event-timeline`, `.timeline-track`, `.timeline-event`, `.verification-table`, `.verification-badge`, status colors

### Ship Technical Dossier (ship-kestrel.json)
- Generator: `ship-kestrel-analysis.ts` + `generate-ship-kestrel.ts`
- Tests: `ship-kestrel-analysis.test.ts` (17 tests)
- Sections: 基本仕様, 損傷・修復の経過 (with EventTimeline), 推力・加速度の変遷, 質量の謎, 限界パラメータのドラマツルギー, 総合評価

### Physics & Science Accuracy (science-accuracy.json)
- Generator: `science-accuracy-analysis.ts` + `generate-science-accuracy.ts`
- Tests: `science-accuracy-analysis.test.ts` (23 tests)
- Sections: 検証方法, 検証スコアカード (with VerificationTable), Brachistochrone力学の検証, 実測データとの照合, 航法精度の検証, 総合評価
- Verification scorecard: 11 items, 7 verified, 3 approximate, 1 unverified, 0 discrepancy

### Test Results
- 814 TS tests + 79 Rust tests = 893 total (0 failures)
- Site builds: 5 episodes, 24 transfers, 3 summaries, 7 logs

## Depends on
- Cross-episode analysis infrastructure (Task 021)
- All episode analyses
