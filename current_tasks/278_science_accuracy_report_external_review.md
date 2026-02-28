# Task 278: Science Accuracy Report External Review

## Status: DONE

## Motivation

The science-accuracy report (`reports/data/summary/science-accuracy.md`) summarizes quantitative verification of scientific claims across all 5 episodes, checking depicted values against real-world data. Following the established review pattern (Tasks 266-277), conduct an external review to check data integrity, readability, factual consistency, and accessibility to newcomers unfamiliar with the series or orbital mechanics.

## Issues Found and Fixed

External review (Sonnet agent) found 12 issues:

1. **HIGH**: Navigation error formula used wrong distance — total solar distance 14.72 AU (2.202×10⁹ km) instead of remaining distance to Uranus 4.48 AU (6.704×10⁸ km). Formula also used sin instead of tan. Result (14,393,613 km) was correct but intermediate calculation was wrong.
2. **HIGH**: EP02 shortening factor was 8× — corrected to 42× (Hohmann 3,671d ÷ trim-thrust 87d).
3. **MEDIUM**: No newcomer introduction — added "はじめに" section with series overview and navigation links.
4. **MEDIUM**: Oberth effect 3% vs 0.07% gap under-explained — expanded reference note to clarify classical Oberth (0.07%) vs mission-level composite (3%).
5. **MEDIUM**: EP4/EP5 ΔV table ambiguity — added clarifying notes that EP4 and EP5 share same route, EP5 uses composite.
6. **MEDIUM**: RK4 rows labeled as "depicted" when they're computational verification — prefixed with 【計算手法検証】 and clarified depicted values.
7. **MEDIUM**: EP02 trim-thrust arrival velocity inconsistency (v∞≈90 km/s vs 0.61 km/s capture) not mentioned — added to 総合評価 as known open issue.
8. **MEDIUM**: EP4 "8.3日" figure is hypothetical brachistochrone, not depicted — added "(300t仮想Brachistochrone)" annotation.
9. **LOW**: vis-viva equation entries had no hyperlinks — added Wikipedia links.
10. **LOW**: No navigation links to episode reports — added links throughout section headers and body.
11. **LOW**: Glossary missing Brachistochrone, RK4, ICRP, プラズモイド — added 4 terms.
12. **LOW**: Peak vs average velocity conflation in cruise speed 3000 km/s entry — noted but left as-is (93% accuracy with approximate status is defensible).

+6 regression tests (nav error remaining distance, EP02 shortening factor, newcomer intro, EP02 velocity issue, episode links, glossary completeness). Tech-overview stats refreshed (278 tasks, 2,083 TS tests, 2,674 total). Total: 2,083 TS tests.
