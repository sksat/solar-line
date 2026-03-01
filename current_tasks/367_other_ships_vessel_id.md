# Task 367: Add MPA-MC-SCV-02814 Vessel ID to Other-Ships Report

## Status: DONE

## Description
The other-ships report's EP02 large ship section discusses mass, orbit, and tactics but omits the onscreen vessel ID "MPA-MC-SCV-02814" visible on the navigation HUD. This ID independently corroborates きりたん's dialogue inference about the ship's affiliation, and the same ID appears in EP03 (ケイ reporting two communications with MPA-MC-SCV-02814).

## Changes
- `reports/data/summary/other-ships.md`: Vessel ID analysis paragraph + EP03 cross-reference
- `ts/src/article-content-validation.test.ts`: TDD content tests
- `reports/data/summary/tech-overview.md`: Stats refresh
