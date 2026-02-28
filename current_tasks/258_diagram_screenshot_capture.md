# Task 258: Playwright Diagram Screenshot Capture

## Status: DONE

## Description

Extension of Task 255 (agent-reviewable viz structure). Added Playwright-based screenshot capture for all orbital diagrams. Agents can read the PNG files to visually review rendered diagrams.

## Deliverables

- `e2e/diagram-screenshots.spec.ts`: 6 tests (5 episodes + cross-episode)
- Captures all 19 orbital diagrams to `dist/screenshots/`
- Named by episode + diagram ID (e.g., `EP04_ep04-diagram-02.png`)
- Run: `npx playwright test e2e/diagram-screenshots.spec.ts`

## Visual Verification

Screenshots confirmed:
- EP04 Titania departure: escape arc correctly goes outward (Task 254 fix verified)
- EP05 heliocentric: all 5 planets visible with proper positions (Task 253 fix verified)
- Cross-episode full route: all transfer legs visible with timeline annotations

## Stats
- E2E tests: 185 → 191 (+6 screenshot tests)
