# Task 354: Journey Overview Visualization on Landing Page

Status: Done
Created: 2026-03-01

## Goal
Add a visual "journey overview" strip to the landing page that shows the complete
Mars → Ganymede → Enceladus → Titania → Earth route at a glance. For each leg,
show distance, duration, margin indicator, and one-line narrative stakes.

## Motivation
Codex review identified that while the per-episode analysis is deep, readers lack
an instant "big picture" of the entire series. A visual journey overview bridges
the gap between technical analysis and story meaning (Codex suggestions #3 and #4).

## Implementation
- Add `renderJourneyOverview()` function to templates.ts
- Show each of the 5 legs as a connected strip with:
  - Origin → Destination labels
  - Key metrics: distance (AU), duration, ΔV
  - Margin indicator (color-coded: green=comfortable, yellow=tight, red=critical)
  - One-line narrative stakes (物語上の意味)
- Include the visualization between the conclusion and reading guide sections
- Add tests for the new component

## Data Source
- Episode analysis data (distances, durations from calculations)
- Verdict data (per-episode)
- Manually curated narrative stakes (one line per leg)
