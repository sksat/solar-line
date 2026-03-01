# Task 295: Accessibility Improvements

## Status: DONE

## Goal
Fix ARIA accessibility issues in HTML generation templates for better screen reader support.

## Issues to Fix
1. Task progress bar SVG missing `role="img"` and `aria-label` (templates.ts ~3356)
2. Nav dropdown buttons missing `aria-expanded` and `aria-haspopup` (templates.ts ~787-801)
3. Play button aria-label doesn't toggle between 再生/一時停止 (templates.ts ~1855)
4. Transcription tab buttons lack ARIA tab pattern (templates.ts ~3195)
5. SQL query textarea missing aria-label (templates.ts ~3500)
6. Brachistochrone preset buttons lack aria-pressed (templates.ts ~2188)
7. Mark orbital_transfer_diagrams.md idea as RESOLVED

## Files to Update
- ts/src/templates.ts
- ideas/orbital_transfer_diagrams.md
