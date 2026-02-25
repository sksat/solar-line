# Task 163: Transfer Leg → Episode Navigation Links

## Status: DONE

## Motivation

The full-route orbital diagram in the cross-episode summary page has interactive leg highlighting (Task 162). When a user hovers/clicks a transfer leg, they see a tooltip with the leg label. However, there's no way to navigate from a leg to the corresponding episode analysis page.

This is the remaining enhancement from `ideas/full_route_enhancements.md`:
> Leg highlighting could include episode navigation links (click a leg → go to that episode's analysis)

## Goal

Add clickable episode navigation links to transfer leg tooltips. When a user clicks a transfer leg in the full-route diagram, the tooltip shows both the leg label and a "→ 第N話分析" link that navigates to the corresponding episode page.

## Approach

1. Add `data-leg-episode` attribute to `<g class="transfer-leg">` groups in the SVG renderer
2. Parse episode number from the transfer arc label (e.g., "EP1: ..." → episode 1)
3. Update tooltip in `orbital-animation.js` to render an HTML link when episode data is available
4. Add tests for the new attributes and tooltip behavior

## Dependencies

- Task 162 (leg highlighting — DONE)
