# Task 255: Agent-Reviewable Visualization Structure

## Status: DONE

## Description

Human directive: Build a structure that makes it easy for agents to review animation and visualization outputs.

## Deliverables

### 1. `npm run review-diagrams` script
- Extracts all 15 orbital diagrams from episode reports
- Produces structured text summary: orbits (sorted by radius), transfers (with direction), animation config, scenarios
- Runs invariant checks inline: static body warnings, escape direction, missing timing, orphan references
- Exits non-zero if issues found — usable as CI check
- Output is agent-readable plain text (no HTML/SVG needed)

### 2. Diagram inventory tests (`review-diagrams.test.ts`, 8 tests)
- All 5 episodes have diagrams
- Every diagram has id, title, orbits, transfers, description
- At least 10 animated diagrams with valid durationSeconds
- At least one timed transfer per animated diagram

### 3. Fixed ep05-diagram-02 animation data
- Added scenarios (moon-capture, leo-direct) and timing to previously untimed transfers
- Added burn markers for capture events

## Stats
- TS tests: 2,006 → 2,018 (+12)
- All 2,580 tests pass (0 failures)
