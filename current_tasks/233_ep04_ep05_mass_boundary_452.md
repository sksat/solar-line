# Task 233: Fix remaining 452t → 452.5t in EP04 and EP05

## Status: DONE

## Description

Task 228 fixed EP03/EP01 mass boundary references from 452t to 452.5t, but missed EP04 (1 instance) and EP05 (3 instances). Fix these for cross-episode consistency.

## Files
- `reports/data/episodes/ep04.md` — line 927 (回避ΔV scenario)
- `reports/data/episodes/ep05.md` — lines 888, 955, 1687 (cross-episode mass references)
