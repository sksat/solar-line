# Task 338: Jupiter Flyby Simulation/Visualization Review

## Status: DONE

## Description
The Jupiter flyby appears more like a stop-and-restart than a flyby in the current simulation/visualization. Review whether the simulation and visualization correctly represent the Jupiter gravity assist.

## Source
Human directive (AGENT_PROMPT.md phase 25): "木星フライバイ、フライバイというよりは一度木星で停止しているように見える。シミュレーションや可視化は正しい？"

## Deliverables
- [x] Review orbital diagram animation for Jupiter flyby
- [x] Check if flyby trajectory is physically correct
- [x] Fix visualization if it misrepresents the maneuver

## Root Cause
The full-route-diagram in cross-episode.md encoded EP5 as a **single transfer arc** from Uranus directly to Earth. The animation system interpolates ship position linearly along a quadratic Bezier curve, so the ship slid along a Uranus→Earth arc without passing through Jupiter. The "木星フライバイ" was only a `midcourse` burnMarker along this arc — visually showing a brief plume at a point that was not Jupiter's actual position.

## Fix
Split the single EP5 Uranus→Earth transfer into two legs:
1. **Uranus→Jupiter** (375h coast + flyby approach) — red arc
2. **Jupiter→Earth** (132h Oberth acceleration + deceleration + LEO capture) — orange arc

This matches the pattern already used in ep05-diagram-03 (episode-level diagram). The animation now smoothly transitions through Jupiter's orbital position, correctly visualizing the gravity assist.

## Tests
- +1 TDD test: "full-route EP5 is split into two legs via Jupiter (not single arc)"
- Updated burn marker angle to match Jupiter orbit static angle (1.3786)
- All 2236 TS tests pass, 228 E2E tests pass
