# Task 224: Add MDX episode support to update-diagram-angles

## Status: DONE

## Problem

`update-diagram-angles.ts` skips episode MDX files, which caused stale epoch annotations to persist after the JSON→MDX migration (Task 222 root cause).

## Changes

1. **MDX episode support**: Script now parses episode MDX files using `parseEpisodeMarkdown()`, modifies diagram angles/annotations, and replaces the `diagrams:` JSON block in-place. Same pattern as the existing cross-episode MDX handling.

2. **Custom epoch annotation preservation**: Epoch annotations with parenthetical suffixes (`（...）`) are treated as manually curated and not overwritten. This handles EP04's annotation which shows a 48kt/105-day reference scenario instead of the actual 507h route.

3. **Intermediate planet burn safety**: Burn marker updates now only apply to burns at the event's departure or arrival planet. Intermediate waypoint burns (e.g., Jupiter flyby in EP05's composite route) are skipped since they require flyby-specific timing that the event-level JD can't provide.

4. **Test**: Added test for EP04 custom annotation preservation.

## Files
- `ts/src/update-diagram-angles.ts`
- `ts/src/update-diagram-angles.test.ts`

## Notes
- The script updates planet orbit angles and epoch annotations correctly for all 5 MDX episodes
- Running `npm run update-diagram-angles` will update EP04 and EP05 planet positions (which have drifted from the legacy values). These changes are intentionally not applied in this commit to keep the PR focused on the code fix.
