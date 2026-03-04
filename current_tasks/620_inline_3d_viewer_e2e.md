# Task 620: Fix Inline 3D Viewer Initialization in Episode Pages + E2E Tests

Status: DONE

## Problem
1. Inline 3D viewers in episode pages EP01-EP04 never initialized — controls stayed hidden (`display:none`), no JS errors reported
2. Zero E2E tests for inline 3D viewer initialization in episode pages

## Root Cause
In `templates.ts`, the `__prepareScene` function is embedded in a template literal string. The regex `/^episode-(\d+)$/` used `\d` which is not a recognized escape sequence in template literals — JavaScript silently converts `\d` to `d`, producing the regex `/^episode-(d+)$/` which never matches scene names like "episode-1".

EP05 was unaffected because it has a hardcoded `if (sceneName === "episode-5")` handler that runs before the general episode-N regex handler.

## Solution
1. Fixed regex: `\d` → `\\d` in template literal (line 3494 of templates.ts)
2. Added 6 E2E tests verifying all 5 episodes initialize without JS errors + EP01 scene name check

## Files Modified
- `ts/src/templates.ts` — Fix escaped regex in `__prepareScene` template literal
- `ts/e2e/reports.spec.ts` — Add inline 3D viewer initialization E2E tests
