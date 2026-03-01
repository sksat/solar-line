# Task 368: Add Burn-Count Margin to Ship-Kestrel Summary

## Status: DONE

## Description
The ship-kestrel report's "限界パラメータのドラマツルギー" section lists EP04 plasmoid shield margin and EP05 nozzle lifetime margin, but omits the burn-count margin: HUD "1-2 BURNS MAXIMUM" (02:38, before plasmoid) → "3-4回" (17:16, after Titania repair). This ~2x recovery represents another ギリギリ constraint in the margin cascade.

## Changes
- `reports/data/summary/ship-kestrel.md`: Burn-count margin in dramaturgical parameters section
- `ts/src/article-content-validation.test.ts`: TDD content test
- `reports/data/summary/tech-overview.md`: Stats refresh
