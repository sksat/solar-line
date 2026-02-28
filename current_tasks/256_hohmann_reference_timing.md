# Task 256: Add Timing to Hohmann Reference Transfers

## Status: DONE (No Action Needed)

## Description

The `npm run review-diagrams` script flagged 5 Hohmann reference transfers as missing `startTime/endTime`. After analysis, these are intentionally static reference lines — the Hohmann transfer takes years (3.1-27 years) while the animation duration matches the brachistochrone (hours-days). Animating them would require either extremely long animation or unrealistic time compression.

The "issue" is informational, not a bug. The review-diagrams script correctly warns about missing timing, which helps agents identify whether untimed transfers are intentional (Hohmann reference) or bugs (like ep05-diagram-02 was).
